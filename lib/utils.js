'use strict';

const zlib = require('zlib');
const g_crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');
const {  ECPairFactory } = require('ecpair');
const fetch = require('node-fetch');
const Buffer = require('buffer').Buffer;
const constants = require('./constants.js');
const tinysecp= require('tiny-secp256k1');
const ECPair= ECPairFactory(tinysecp);

let networks = {
  'BTC' : {
      url: 'http://127.0.0.1:18332/wallet/URWALLET',
      user: 'rpc_btc_test',
      password: 'rpc_btc_password_test',
      name: 'Bitcoin',
      NETWORK: bitcoin.networks.bitcoin,
      segwit: true
  },
};

exports.getNetwork = function(network = "BTC")
{
  return networks[network];
}
exports.updateNetwork = function(url, user, password, network = "BTC")
{
  networks[network].url = url;
  networks[network].user = user;
  networks[network].password = password;
}

exports.sendRPC = function(method, params, network = "BTC")
{
  const headers = {
      'Content-Type': 'text/plain',
      'Authorization': 'Basic ' + Buffer.from(networks[network].user + ':' + networks[network].password).toString('base64')
  }

  const body = '{"jsonrpc": "1.0", "id":"curltest", "method": "'+method+'", "params": '+params+' }';

  try {
    return fetch(networks[network].url, {
        method: 'post',
        headers: headers,
        body: body})
        .then(res => {
          if (res.status*1 < 400 || res.status*1 >= 500)
            return res.json();
          throw new Error("Connection error: "+res.statusText);
        })
        .catch(err => { return {error: true, message: err.message}});
  }
  catch(e) {
    return {error: true, message: e.message};
  }
        
  

}

exports.importaddress = function(address, label = "", network = "BTC")
{
    return exports.sendRPC('importaddress', '["'+address+'", "'+label+'", false]', network);
}

exports.broadcast = function(hex, network = "BTC")
{
    return exports.sendRPC('sendrawtransaction', '["'+hex+'"]', network);
}

exports.getrawtransaction = function(txid, network = "BTC")
{
    return exports.sendRPC('getrawtransaction', '["'+txid+'", true]', network);
}

exports.listsinceblock = function(hash, network = "BTC")
{
    return exports.sendRPC('listsinceblock', '["'+hash+'", 1, true]', network);
}

exports.unspents = function(address = "", conf = 0, maxconf = 9999999, network = "BTC")
{
    const filter = address.length ? ', ["'+address+'"]' : "";

    return exports.sendRPC('listunspent', '['+conf+', '+maxconf+filter+']', network);
}

exports.height = function(network = "BTC")
{
    return exports.sendRPC('getblockcount', '[]', network);
}

exports.getblockhash = function(height, network = "BTC")
{
    return exports.sendRPC('getblockhash', '['+height+']', network);
}

exports.getwalletaddress = function(network = "BTC")
{
  return new Promise(async ok => {
    const array = await exports.sendRPC("getaddressesbylabel", '["wallet"]', network);
    if (array && !array.error && array.result)
    {
      for (let key in array.result)
        return ok(key);
    }
    
    const address = await exports.getnewaddress("wallet");
    if (address && !address.error)
      return ok(address.result);
      
    return ok("");
    
  })
}

exports.Hash160 = function(str)
{
    const buffer = str.length % 2 != 0 ? Buffer.from(str) : Buffer.from(str, "hex");
    return g_crypto.createHash("ripemd160").update(buffer).digest('hex')
}

////////////////////////////////

exports.getbalance = function(network = "BTC")
{
    return exports.sendRPC('getbalance', '["*"]', network);
}
exports.sendtoaddress = function(address, amount, network = "BTC")
{
    return exports.sendRPC('sendtoaddress', '["'+address+'", '+1*amount.toFixed(7)+']', network);
}
exports.getnewaddress = function(label = "", type = "legacy", network = "BTC")
{
    return exports.sendRPC('getnewaddress', '["'+label+'", "'+type+'"]', network);
}
exports.testmempoolaccept1 = function(rawtx, network = "BTC")
{
    return exports.sendRPC('testmempoolaccept', '[["'+rawtx+'"]]', network);
}
exports.importprivkey = function(privkey, network = "BTC")
{
    return exports.sendRPC('importprivkey', '["'+privkey+'", "generated", false]', network);
}


function GetRedeemScript(keyPair)
{
    const redeemScript = bitcoin.script.compile([
      //redeem: <signature> <data> <data>
      bitcoin.opcodes.OP_DROP,
      bitcoin.opcodes.OP_DROP,
      Buffer.from(keyPair.publicKey, "hex"),
      bitcoin.opcodes.OP_CHECKSIG
    ])

    return redeemScript;
}

function GetP2SH(keyPair, network = "BTC")
{
    return bitcoin.payments.p2sh({ redeem: { output: GetRedeemScript(keyPair), network: networks[network].NETWORK }, network: networks[network].NETWORK });
}

function GetP2WSH(keyPair, network = "BTC")
{
    return bitcoin.payments.p2wsh({ redeem: { output: GetRedeemScript(keyPair), network: networks[network].NETWORK }, network: networks[network].NETWORK });
}

function chunks (buffer, chunkSize) {
	assert(Buffer.isBuffer(buffer),           'Buffer is required');
	assert(!isNaN(chunkSize) && chunkSize > 0, 'Chunk size should be positive number');

	var result = [];
	var len = buffer.length;
	var i = 0;

	while (i < len) {
		result.push(buffer.slice(i, i += chunkSize));
	}

	return result;
}

function assert (cond, err) {
	if (!cond) throw new Error(err);
}

function GetFirstTransactions(sendto1, keyPair, outArr, network)
{
  return new Promise(async ok => {
    let ret = [];
    const script = networks[network].segwit ? GetP2WSH(keyPair, network) : GetP2SH(keyPair, network);
    for (let i=0; i<outArr.length; i++)
    {
      const first_transaction = await exports.sendtoaddress(script.address, sendto1, network);

      if (!first_transaction || first_transaction.error|| !first_transaction.result.length)
        return ok({result: false, message: first_transaction && first_transaction.error ? first_transaction.error.message : 'sendtoaddress - error!'});

      ret.push(first_transaction);
    }
    return ok({result: true, transactions: ret, script: script});
  })
}

/*function AddInputsOld(sendto1, first, network)
{
  return new Promise(async ok =>
  {
    const txb = new bitcoin.TransactionBuilder(networks[network].NETWORK);

    for (let i=0; i<first.transactions.length; i++)
    {
      const firstTX = await exports.getrawtransaction(first.transactions[i].result, network);
      if (!firstTX || firstTX.error)
        return ok({result: false, message: 'getrawtransaction failed!'});

      //find our output
      for (let j=0; j<firstTX.result.vout.length; j++)
      {
        if (firstTX.result.vout[j].value*1E8 != sendto1*1E8)
          continue;

        //add old output as new input
        txb.addInput(first.transactions[i].result, firstTX.result.vout[j].n, null, first.script.output);
        break;
      }
    }

    return ok({result: true, txb: txb});
  })
}*/

function idToHash(txid) {
  return Buffer.from(txid, 'hex').reverse();
}

function toOutputScript(address, network){
  return bitcoin.address.toOutputScript(address, networks[network].NETWORK);
}

function AddInputs(sendto1, first, network)
{
  return new Promise(async ok =>
  {
    const tx = new bitcoin.Transaction(networks[network].NETWORK);

    for (let i=0; i<first.transactions.length; i++)
    {
      const firstTX = await exports.getrawtransaction(first.transactions[i].result, network);
      if (!firstTX || firstTX.error)
        return ok({result: false, message: 'getrawtransaction failed!'});

      //find our output
      for (let j=0; j<firstTX.result.vout.length; j++)
      {
        if (firstTX.result.vout[j].value*1E8 != sendto1*1E8)
          continue;

        //add old output as new input
        tx.addInput(idToHash(first.transactions[i].result), firstTX.result.vout[j].n);
        break;
      }
    }

    return ok({result: true, tx: tx});
  })
}

async function SaveChunkToBlockchain(buffer, keyPair, newAddress, network = "BTC")
{
  //Splitting data string to small chunks (MAX_DATA_SIZE*2)
  const outArr = chunks(buffer, constants.tx.MAX_DATA_SIZE*2);

  if (network == 'BTC')
    constants.tx.FEE_FOR_BYTE = 5;

  const minFee = constants.tx.EMPTY_TX_SIZE*constants.tx.FEE_FOR_BYTE;
  const fee = (buffer.length + constants.tx.EMPTY_TX_SIZE) * constants.tx.FEE_FOR_BYTE;
  const balance = await exports.getbalance();

  //check user balance
  if (!balance || balance.error || balance.result*1 < (fee*1+2*minFee)/1E8)
    return {result: false, message: 'insufficient funds!'};

  //Send first transactions on random address
  const sendto1 = ((fee/outArr.length+2*minFee)/1E8).toFixed(7)*1;
  const first = await GetFirstTransactions(sendto1, keyPair, outArr, network);

  if (first.result == false)
    return {result: false, message: first.message};

  assert(outArr.length == first.transactions.length);

  const inputs = await AddInputs(sendto1, first, network);

  if (inputs.result == false)
    return {result: false, message: inputs.message};

  inputs.tx.addOutput(toOutputScript(newAddress.result, network), fee*1+minFee);

  //const tx = inputs.txb.buildIncomplete();

  const redeemScript = first.script.redeem.output;
  for (let i=0; i<first.transactions.length; i++)
  {
    //const signatureHash = tx.hashForSignature(i, redeemScript, bitcoin.Transaction.SIGHASH_ALL);
    const signatureHash = networks[network].segwit ?
      inputs.tx.hashForWitnessV0(i, redeemScript, (sendto1*1E8).toFixed(0)*1, bitcoin.Transaction.SIGHASH_ALL) :
      inputs.tx.hashForSignature(i, redeemScript, bitcoin.Transaction.SIGHASH_ALL);

    const signature = bitcoin.script.signature.encode(keyPair.sign(signatureHash), bitcoin.Transaction.SIGHASH_ALL);

    //Splitting small chunk to the script data chunks (MAX_DATA_SIZE)
    const data = chunks(outArr[i], constants.tx.MAX_DATA_SIZE);

    networks[network].segwit ?
      inputs.tx.setWitness(i, [
        signature,
        data[0],
        data.length == 2 ? data[1] : Buffer.from('00', 'hex'),
        redeemScript
      ]) :
      inputs.tx.setInputScript(i, bitcoin.script.compile([
        signature,
        data[0],
        data.length == 2 ? data[1] : Buffer.from('00', 'hex'),
        redeemScript
      ]));
  }

  const ret = await exports.broadcast(inputs.tx.toHex());

  if (ret.error)
    return {result: false, message: ret.error.message};

  return {result: true, txid: ret.result};

}

function SaveBufferToBlockchain (buffer, network = "BTC")
{
  return new Promise(ok => {
    zlib.deflate(buffer, async (err, deflated_buffer) =>
    {
      //splitting binary data to big chunks MAX_TRANSACTION_SIZE
      const bigChunks = chunks(deflated_buffer, constants.tx.MAX_TRANSACTION_SIZE);

      //create first address pair

      const keyPair = ECPair.makeRandom({ network: networks[network].NETWORK });
      const privateKey = keyPair.toWIF();
      // const { address } = bitcoin.payments.p2pkh({
      //   pubkey: keyPair.publicKey,
      //   network: TESTNET,
      // });
      // const publicKey = keyPair.publicKey.toString("hex");

      // console.log(address)
      // console.log(publicKey)
      // console.log(keyPair.toWIF())
      

      const ret = await exports.importprivkey(privateKey, network);
      console.log(ret)
      if (ret.error)
        return ok({result: false, message: ret.message ? ret.message : 'importprivkey RPC error!'});

      //Get second address
      const newAddress = networks[network].segwit ?
        await exports.getnewaddress("bech32", "bech32", network) :
        await exports.getnewaddress("legacy", "legacy", network) ;

      if (!newAddress || newAddress.error)
        return ok({result: false, message: newAddress.message ? newAddress.message : 'getnewaddress RPC error!'});

      //console.log(newAddress)

      //Save all big chunks to blockchain and get transactions to array
      const txsArray = []
      for (let i=0; i<bigChunks.length; i++)
      {
        const ret = await SaveChunkToBlockchain(bigChunks[i], keyPair, newAddress, network);
        if (!ret.result || !ret.txid)
          return ok(ret);

        txsArray.push(ret.txid);
      }

      if (txsArray.length == 0)
        return ok({result: false, message: "unknown error!"});

      if (txsArray.length == 1)
        return ok({result: true, txid: txsArray[0]});

      //Save transactions as data to blockchain
      const dataString = JSON.stringify(txsArray);
      const strJSON = JSON.stringify({type: 'txs', base64: Buffer.from(dataString).toString('base64')});

      return ok(await exports.SaveBufferToBlockchain(Buffer.from(strJSON)));
    });
  });
}

exports.SaveTextToBlockchain = async function(dataString, network = "BTC")
{
  const strJSON = JSON.stringify({type: 'text', base64: Buffer.from(dataString).toString('base64')})
  return await SaveBufferToBlockchain(Buffer.from(strJSON));
}

exports.SaveJSONToBlockchain = async function(objectJSON, network = "BTC")
{
  const strJSON = JSON.stringify({type: 'json', base64: Buffer.from(JSON.stringify(objectJSON)).toString('base64')})
  return await SaveBufferToBlockchain(Buffer.from(strJSON));
}

exports.SaveFileToBlockchain = async function(data, network = "BTC")
{
  const strJSON = JSON.stringify({type: 'file', base64: Buffer.from(data).toString('base64')})
  return await SaveBufferToBlockchain(Buffer.from(strJSON));
}

function GetDataFromTXID(txid, network = "BTC")

{
  return new Promise(async ok => {
    const txData = await exports.getrawtransaction(txid, network);
    if (!txData || txData.error)
      return ok({type: 'error', data: txData || null, message: txData ? txData.error.message || txData.message : "Unknown error 1"});

    let fullData = "";
    for (let i=0; i<txData.result.vin.length; i++)
    {
        fullData += txData.result.vin[i].txinwitness[1];
        fullData += txData.result.vin[i].txinwitness[2] == "00" ? "" : txData.result.vin[i].txinwitness[2];
    }

    return ok({type: 'success', string: fullData});
  });
}

function GetObjectFromFullDataString(fullDataString)
{
  return new Promise(async ok => {
    zlib.inflate(Buffer.from(fullDataString, "hex"), (err, inflated_buffer) =>
    {
      try {
        return ok(JSON.parse(inflated_buffer.toString('utf8')));
      } catch (e) {
        return ok({type: 'error', data: fullDataString, err: err, error: e, message: e.message});
      }
    });
  });
}

function ErrorPage(message = "Error!")
{
  return {base64: Buffer.from("<html><body><h2>"+message+"</h2></body></html>").toString('base64'), type: "text"};
}

function GetDataFromObject(obj, network = "BTC")
{
  return new Promise(async ok => {
    if (obj.type == 'error')
      return ok(ErrorPage(obj.message || "Unknown error!"));

    if (obj.type == 'txs')
    {
      try {
        const txsArray = JSON.parse(Buffer.from(obj.base64, 'base64').toString('utf8'));

        let fullData = "";
        for (let i=0; i<txsArray.length; i++)
        {
          const data = await GetDataFromTXID(txsArray[i], network);
          if (data.type == 'error')
            return ok(ErrorPage(data.message || "Unknown error!"));

          fullData += data.string;
        }

        const objJSON = await GetObjectFromFullDataString(fullData);

        return ok(await GetDataFromObject(objJSON, network));
      }
      catch(e) {
        return ok(ErrorPage(e.message));
      }
    }
    
    //if (obj.type == 'text' || obj.type == 'file')
    return ok({base64: obj.base64, type: obj.type || 'buffer'});
  });
}

exports.GetObjectFromBlockchain = function(txid, network = "BTC")
{
  return new Promise(async ok => {

    const data = await GetDataFromTXID(txid, network);
    if (data.type == 'error')
      return ok(ErrorPage(data.message || "Unknown error!"));

    const obj = await GetObjectFromFullDataString(data.string);

    return ok(await GetDataFromObject(obj, network));

  });
}

exports.SplitBalance = async function(count = 10, network = "BTC")
{
  const minFee = constants.tx.EMPTY_TX_SIZE*constants.tx.FEE_FOR_BYTE;
  const balance = await exports.getbalance();
  
  if (!balance || balance.error)
    return {result: false, messaage: balance && balance.error ? balance.error.messaage : 'error at getbalance'};
  if (balance.result/count < 0.0001)
    return {result: false, messaage: 'too low balance'};
  
  const address = await exports.getwalletaddress(network); 
  if (!address || !address.length)
    return {result: false, message: 'error at getwalletaddress'};
    
  for (let i=0; i<count; i++)
  {
    const ret = await exports.sendtoaddress(address, balance.result/count, network);
    
    if (!ret || ret.error || !ret.result.length)
      return {result: false, message: ret && ret.error ? ret.error.message : 'sendtoaddress - error!'};
  }
  
  return {result: true};
}


exports.GetSettings = function(key)
{
  return new Promise(ok => {

    chrome.storage.local.get([key], items => {
        ok(items[key])});

  });
}
exports.SetSettings = function(keyval)
{
  chrome.storage.local.set(keyval);
}