'use strict';

const blockchaindata = require('btc-truth-machine');
const bitcoin = require('bitcoinjs-lib');
const fs = require('fs');

blockchaindata.updateNetwork('http://127.0.0.1:18332/wallet/NAME','rpc_btc_test', 'rpc_btc_password_test', bitcoin.networks.testnet);


async function write()
{
    try {      
        const data = fs.readFileSync('text.txt', 'utf8');
        const ret1 = await blockchaindata.SaveTextToBlockchain(data);
        if (ret1.result == false) throw new Error("SaveTextToBlockchain failed, message: "+ret1.message);

       console.log("SaveTextToBlockchain success! txid="+ret1.txid+"\n--------------------------")
    }
    catch (e) {
        console.log(e.message)
    }
}

write()
