# btc.truthmachine_v0.1
as a reference we took this library, fixed it, and are starting to rewrite and improve it:  
https://github.com/3s3s/blockchaindata-lib

WRITING A TEXT DOCUMENT IN BITCOIN BLOCKCHAIN

The article on which this paper is based:

Install a library that communicates with bitcoin-cli
https://www.npmjs.com/package/blockchaindata-lib
Write code in Node.js to write text into a blockchain that will read data from a text file

'use strict';
 
const blockchaindata = require('blockchaindata-lib');
const fs = require('fs');

async function write()
{
    try {
        //Сохраняем текст в блокчейне        
        const data = fs.readFileSync('2.txt', 'utf8');
        const ret1 = await blockchaindata.SaveTextToBlockchain(data);
        if (ret1.result == false) throw new Error("SaveTextToBlockchain failed, message: "+ret1.message);

       console.log("SaveTextToBlockchain success! txid="+ret1.txid+"\n--------------------------")
    }
    catch (e) {
        console.log(e.message)
    }
}

write()

