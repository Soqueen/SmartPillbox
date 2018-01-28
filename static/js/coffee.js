var application = {
    handleResult: function (intention, concepts, status) {
        console.log(intention);
        console.log(concepts);
        console.log(status);
        
        // var type = ((concepts['CoffeeType'][0]) || {}).value;
        // var size = ((concepts['CoffeeSize'][0]) || {}).value;

        // if (size)
        //     $('#app_size').html('Size: ' + size);
        // else
        //     $('#app_size').html('');

        // if (type)
        //     $('#app_type').html('Type: ' + type);
        // else
        //     $('#app_type').html('');

        // if (status === 'finished') {
        //     $('#app_price').html('Price: ' + calculatePrice(type, size))
        // }
    },
    reset: function () {
        $('#app_size').html('')
        $('#app_price').html('')
        $('#app_type').html('')
    }
};

function calculatePrice(type, size) {
    var price = 2;
    switch(type) {
        case 'americano':
            price = 1.5;
            break;
        case 'latte':
            price = 2.5;
            break;
    }

    switch (size) {
        case 'sm':
            price *= .75;
            break;
        case 'lg':
            price *= 1.5;
            break;
    }

    return Math.round(price * 100) / 100;
}