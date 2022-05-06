# btc-truth-machine
as a reference we took this library, fixed it, and are starting to rewrite and improve it:  
https://github.com/3s3s/blockchaindata-lib

WRITING A TEXT DOCUMENT IN BITCOIN BLOCKCHAIN

The article on which this paper is based:

Install a library that communicates with bitcoin-cli
https://www.npmjs.com/package/blockchaindata-lib

Write code in Node.js to write text into a blockchain that will read data from a text file

```JavaScript
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
```

Maximum file size ~65 Kilobytes (in testnet). Currently working on expanding mainnet max capacity which is about 40 symbols now.
After a successful write operation hash will be returned to the transaction, which contains our document, compressed using the deflate algorithm by the zlib library


After that you can read the file and display its content in the console or redirect the output to another file

```JavaScript
'use strict';
 
const blockchaindata = require('btc-truth-machine');

const hash = '557405e2e5e1919f1b3566493a478bf45400607f54a0b371a321242faaa6e437';

async function read()
{
    try {
        const savedObject = await blockchaindata.GetObjectFromBlockchain(hash);
        if (savedObject.type == 'error') throw new Error(savedObject.message)
        
        console.log(Buffer.from(savedObject.base64, 'base64').toString('utf8'));
    }
    catch(e) {
        console.log(e.message)
    }
}

read();
```

