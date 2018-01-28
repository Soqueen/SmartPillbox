(function () {

    var IS_LOG_ACTIVE = false; // Set this variable to true to see the full interaction

    // UserMedia

    var userMedia = undefined;
    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;


    if (!navigator.getUserMedia) {
        console.error("No getUserMedia Support in this Browser");
    }

    if (window.location.protocol === 'file:') {
        $("#content").hide();
        $("#error").show();
        return;
    } else {
        $("#error").hide();
        // INIT
        Nuance.logger = {
            log: function (msg) {
                LOG(msg, 'out');
            }
        };
    }


    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function getConfigProperty(propertyName, defaultValue) {
        var value = localStorage.getItem(propertyName);
        if (value) {
            return JSON.parse(value);
        } else if (defaultValue) {
            if (isFunction(defaultValue)) {
                defaultValue = defaultValue();
            }
            localStorage.setItem(propertyName, JSON.stringify(defaultValue));
            return defaultValue;
        }
    }

    function setConfigProperty(propertyName, value) {
        if (isFunction(value)) {
            value = value();
        }
        localStorage.setItem(propertyName, JSON.stringify(value));
    }

    function getUserID() {
        return getConfigProperty("USER_ID", uuidv4);
    }

    // State

    var isRecording = false;

    // Selectors
    var $content = $('#content');
    var $dialogOutput = $('#dialog-output');
    var $url = $('#url');
    var $utterance = $("#utterance");

    var $audioRecognition = $('#audio_recognition');
    var $textRecognition = $('#text_recognition');
    var $reset = $('#reset_dialog');
    var $enableTTS = $('#enable_tts');
    $enableTTS.prop("checked", getConfigProperty("ENABLE_TTS", false));
    $enableTTS.change(function () {
        console.log("enableTTS => " + $enableTTS.prop("checked"));
        setConfigProperty("ENABLE_TTS", !!$enableTTS.prop("checked"));
    });
    var $progressiveASR = $('#progressive_asr');
    $progressiveASR.prop("checked", getConfigProperty("PROGRESSIVE_ASR", false));
    $progressiveASR.change(function () {
        setConfigProperty("PROGRESSIVE_ASR", !!$progressiveASR.prop("checked"));
    });
    $statusLabel = $('#status_label');
    var $dialogContext = $("#dialog-context");
    var $dialogContextError = $("#dialog-context-error");
    $dialogContextError.text('');
    var savedDialogContext = getConfigProperty("DIALOG_CONTEXT", null);
    if (savedDialogContext) {
        $dialogContext.val(JSON.stringify(savedDialogContext, undefined, 4));
    }
    if ($dialogContext.val()) {
        try {
            Nuance.globalDialogState.context = JSON.parse($dialogContext.val());
        } catch (e) {
            $dialogContextError.text(e.message);
        }
    }
    $dialogContext.on('change', function () {
        try {
            $dialogContextError.text('');
            Nuance.globalDialogState.context = JSON.parse($(this).val());
            setConfigProperty("DIALOG_CONTEXT", Nuance.globalDialogState.context);
            prettyPrint(this);
        } catch (e) {
            $dialogContextError.text(e.message);
        }
    });

    $alertType = $('#alert_type');
    $sendAlert = $('#send_alert');
    $sendAlert.click(function () {
        Nuance.globalDialogState.tasks = [{
            "intent": $alertType.val()
        }];
        recognizeText('');
    });

    function prettyPrint(elm) {
        var ugly = elm.value;
        var obj = JSON.parse(ugly);
        elm.value = JSON.stringify(obj, undefined, 4);
    }

    window.prettyPrint = prettyPrint;
    var $currentUserUtterance = null;
    var $endDetection = 0;
    // Default options for all transactions

    var defaultOptions = {
        onopen: function () {
            console.log("Websocket Opened");
            $content.addClass('connected');
        },
        onclose: function () {
            console.log("Websocket Closed");
            $content.removeClass('connected');
        },
        onvolume: function (amplitudeArray) {
            var min = 999999;
            var max = -999999;
            for (var i = 0; i < amplitudeArray.length; i++) {
                var val = amplitudeArray[i];
                if (val > max) {
                    max = val;
                } else if (val < min) {
                    min = val;
                }
            }

            var amplitude = max - min;
            // TODO: use amplitude to show volume feedback and to stop recognition
            $audioRecognition.css('box-shadow', '0 0 ' + amplitude + 'px red');
            if (amplitude <= 2) {
                $endDetection++;
                if ($endDetection > 20) {
                    $audioRecognition.click();
                }
            } else {
                $endDetection = 0;
            }
        },
        onresult: function (msg) {
            LOG(msg);
            if (msg.result_type === "NDSP_ASR_APP_CMD" || msg.result_type === "NDSP_APP_CMD") {
                if (msg.result_format === "nlu_interpretation_results") {
                    $statusLabel.text('Ready');
                    if (msg.nlu_interpretation_results &&
                        msg.nlu_interpretation_results.payload &&
                        msg.nlu_interpretation_results.payload.interpretations &&
                        msg.nlu_interpretation_results.payload.interpretations.length > 0 &&
                        msg.nlu_interpretation_results.payload.interpretations[0].literal) {
                        var literal = msg.nlu_interpretation_results.payload.interpretations[0].literal;
                        if ($currentUserUtterance) {
                            $currentUserUtterance.text(literal);
                            $currentUserUtterance = null;
                        } else {
                            dLog('User', literal, $dialogOutput);
                        }
                    }
                    $textRecognition.prop('disabled', false);
                    $audioRecognition.prop('disabled', false);
                } else if (msg.result_format === "appserver_post_results") { // DIALOG
                    $statusLabel.text('Ready');
                    var dialogPayload = (msg.appserver_results || {}).payload;

                    if (dialogPayload) {
                        delete dialogPayload.diagnostic_info;
                        var firstTask = dialogPayload.tasks[0];
                        var intent = firstTask.intent;
                        var state = firstTask.state;
                        var concepts = firstTask.concepts;
                        application.handleResult(intent, concepts, state);

                        // Handle Actions
                        if (dialogPayload.actions && dialogPayload.actions.length > 0) {
                            var textResponse = "";
                            var ttsResponse = "";
                            for (var i = 0; i < dialogPayload.actions.length; i++) {
                                var action = dialogPayload.actions[i];
                                if (action && action.facets) {
                                    if (action.facets.text && action.facets.text.value) {
                                        if (textResponse) {
                                            textResponse += " ";
                                        }
                                        textResponse += action.facets.text.value;
                                    }
                                    if (action.facets.tts && action.facets.tts.value) {
                                        if (ttsResponse) {
                                            ttsResponse += " ";
                                        }
                                        ttsResponse += action.facets.tts.value;
                                    }
                                }
                            }

                            dLog('System', textResponse || ttsResponse, $dialogOutput);
                            if ($enableTTS.prop('checked')) {
                                tts(ttsResponse || textResponse);
                            }
                            $currentUserUtterance = null;
                        }

                        Nuance.globalDialogState.session = dialogPayload._session;
                        var newContext = JSON.stringify(dialogPayload.context, undefined, 4);
                        $dialogContext.val(newContext);
                    }
                    $textRecognition.prop('disabled', false);
                    $audioRecognition.prop('disabled', false);
                } else if (msg.result_format === "rec_text_results") {
                    if (msg.transcriptions && msg.transcriptions.length > 0) {
                        var literal = msg.transcriptions[0];
                        if ($currentUserUtterance) {
                            $currentUserUtterance.text(literal);
                        } else {
                            $currentUserUtterance = dLog('User', literal, $dialogOutput);
                        }
                    }
                }
            } else if (msg.message === 'query_error') {
                $statusLabel.html('Failed')
                console.error(msg.reason);
                $textRecognition.prop('disabled', false);
                $audioRecognition.prop('disabled', false);
            }

            var objDiv = document.getElementById("dialog-output");
            objDiv.scrollTop = objDiv.scrollHeight;
        },
        onttscomplete: function (transaction_id, pcmdata) {
            var audioSink = new Nuance.AudioSink();
            audioSink.queue = pcmdata;
            $statusLabel.text('Playing TTS...');
            audioSink.play();
            $statusLabel.text('Ready');
            $textRecognition.prop('disabled', false);
            $audioRecognition.prop('disabled', false);
        },
        onerror: function (error) {
            console.error(error);
            $content.removeClass('connected');
            $textRecognition.prop('disabled', false);
            $audioRecognition.prop('disabled', false);
            $currentUserUtterance = null;
            if ($statusLabel.text() != "Ready") {
                // ignore errors if we have already received the results
                $statusLabel.text('Error');
            }
        }
    };

    function createOptions(overrides) {
        var options = Object.assign(overrides, defaultOptions);
        options.appId = APP_CONFIG.APP_ID;
        options.appKey = APP_CONFIG.APP_KEY;
        options.userId = getUserID();
        options.url = APP_CONFIG.URL;
        return options;
    }

    // Text NLU
    function recognizeText(utt) {
        $statusLabel.text('Processing...');
        var options = createOptions({
            text: utt,
            tag: APP_CONFIG.CONTEXT_TAG,
            dialog: true,
            language: APP_CONFIG.LANGUAGE
        });
        $textRecognition.prop('disabled', true);
        $audioRecognition.prop('disabled', true);
        Nuance.startTextNLU(options);
    }

    $textRecognition.on('click', function () {
        recognizeText($utterance.val());
        $utterance.val('');
    });

    // ASR / NLU
    function recognizeVoice(evt) {
        if (isRecording) {
            $statusLabel.text('Processing...');
            Nuance.stopASR();
            $audioRecognition.removeClass('btn-danger');
            $audioRecognition.addClass('btn-primary');
        } else {
            $endDetection = 0;
            $statusLabel.text('Listening...');
            // Acquire audio on-demand
            $textRecognition.prop('disabled', true);
            navigator.getUserMedia({
                audio: true
            }, function (stream) {
                userMedia = stream;
                var options = createOptions({
                    userMedia: userMedia,
                    nlu: true,
                    dialog: true,
                    progressive: !!$progressiveASR.prop('checked'),
                    tag: APP_CONFIG.CONTEXT_TAG,
                    language: APP_CONFIG.LANGUAGE
                });
                Nuance.startASR(options);
                $audioRecognition.removeClass('btn-primary');
                $audioRecognition.addClass('btn-danger');
            }, function (error) {
                console.error("Could not get User Media: " + error);
                $audioRecognition.removeClass('btn-primary');
                $audioRecognition.addClass('btn-danger');
                $audioRecognition.prop('disabled', false);
                $textRecognition.prop('disabled', false);
            });
        }
        isRecording = !isRecording;
    }

    $audioRecognition.on('click', recognizeVoice);

    $reset.on('click', function () {
        Nuance.globalDialogState.session = null;
        $dialogOutput.empty();
        application.reset();
    });

    // TTS
    function tts(ttsText) {
        $statusLabel.text('Getting TTS...');
        var options = createOptions({
            voice: APP_CONFIG.VOICE,
            text: ttsText
        });
        $audioRecognition.prop('disabled', true);
        $textRecognition.prop('disabled', true);
        setTimeout(function () {
            Nuance.playTTS(options);
        }, 10);
    }

    // Helpers
    var dLog = function dLog(title, msg, logger) {
        // var titleHtml = '<div class="chat-entry">';
        // var msgHtml = '';
        // if (title === 'User') {
        //     titleHtml += '<span class="label-success col-sm-1 chat-title">' + title + '</span>';
        //     msgHtml = '<span class="bg-success col-sm-11 chat-msg"></span>';
        // } else {
        //     titleHtml += '<span class="label-primary col-sm-1 chat-title">' + title + '</span>';
        //     msgHtml = '<span class="bg-info col-sm-11 chat-msg"></span>';
        // }
        // titleHtml += '</div>';
        // var $node = $(titleHtml);

        // var $msgNode = $(msgHtml).text(msg);
        // $node.append($msgNode);
        // logger.append($node);
        // return $msgNode;
        return;
    };

    var LOG = function LOG(msg, type) {
        if (IS_LOG_ACTIVE) {
            var time = new Date().toISOString();
            var logMsg = "";
            if (type === 'in') {
                logMsg += 'Incoming (' + time + '): ';
            } else {
                logMsg += 'Outgoing (' + time + '): ';
            }
            logMsg += JSON.stringify(msg, undefined, 4);
            console.log(logMsg);
        }
    };


})();
