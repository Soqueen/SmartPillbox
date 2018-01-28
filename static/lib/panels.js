$(function () {
    rightPanels = [
        'inputs',
        'options'
    ];

    setInactiveNavs = function (ids) {
        for (var i in ids) {
            $('#nav-' + ids[i]).removeClass('active');
        }
    };

    setActive = function (element) {
        $(element).addClass('active');
    };

    hideAllPanels = function(ids) {
        for (var i in ids) {
            $('#panel-' + ids[i]).hide();
        }
    };

    convertToNavIds = function(names) {
        return names.map(function (element) { return '#nav-' + element}).join(',')
    };

    showPanel = function(element) {
        $('#panel-' + element).show();
    };

    handlePanels = function(current, panels) {
        setInactiveNavs(panels);
        setActive('#' + current);
        hideAllPanels(panels);
        showPanel(current.substring(4)); // Remove 'nav-'
    };

    $(convertToNavIds(rightPanels)).click(function () {
        handlePanels(this.id, rightPanels);
    });

    $(document).ready(function () {
        handlePanels('nav-inputs', rightPanels);
    });


});
