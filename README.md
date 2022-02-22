# btc.truthmachine_v0.1
as a reference we took this library, fixed it, and are starting to rewrite and improve it:  
https://github.com/3s3s/blockchaindata-lib

WRITING A TEXT DOCUMENT IN BITCOIN BLOCKCHAIN

The article on which this paper is based:

Install a library that communicates with bitcoin-cli
https://www.npmjs.com/package/blockchaindata-lib

Write code in Node.js to write text into a blockchain that will read data from a text file

```
'use strict';
 
const blockchaindata = require('blockchaindata-lib');
const fs = require('fs');

async function write()
{
    try {
        //Saving text in the blockchain        
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
```

Maximum file size ~65 Kilobytes

After a successful write operation hash will be returned to the transaction, which contains our document, compressed using the deflate algorithm by the zlib library

It took 0.00058288 BTC to record two files
(18 dollars on 7.17.21)

After that you can read the file and display its content in the console or redirect the output to another file

```
'use strict';
 
const blockchaindata = require('blockchaindata-lib');

const hash1 = '8fa9bfbbfb4b62e31b1b52ecc1da3218ece5e8b94648971b52a864ef7a5ba64b';
const hash2 = '557405e2e5e1919f1b3566493a478bf45400607f54a0b371a321242faaa6e437';

async function read()
{
    try {
        const savedObject = await blockchaindata.GetObjectFromBlockchain(hash2);
        if (savedObject.type == 'error') throw new Error(savedObject.message)
        
        // if (savedObject.type == 'text')
        console.log(Buffer.from(savedObject.base64, 'base64').toString('utf8'));
        //else// console.log(savedObject.base64);

    }
    catch(e) {
        console.log(e.message)
    }
}

read();
```

