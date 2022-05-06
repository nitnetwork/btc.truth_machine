'use strict';

const blockchaindata = require('btc-truth-machine');


async function read()
{
    try {
        const savedObject = await blockchaindata.GetObjectFromBlockchain("b436bd6048c45772738e96a514e23e462642dd2fc4b0a2d3e2eb65fd96023ca1");
        if (savedObject.type == 'error') throw new Error(savedObject.message)
        
        console.log(Buffer.from(savedObject.base64, 'base64').toString('utf8'));
    }
    catch(e) {
        console.log(e.message)
    }
}

read();