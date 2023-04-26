import { Parser } from '@json2csv/plainjs';
import { appendFileSync, writeFile } from 'fs';
import * as dotenv from 'dotenv'
import {ux} from '@oclif/core'  //https://github.com/oclif/core/blob/main/src/cli-ux/README.md

dotenv.config()

const contractId = process.argv[2];
const limit = process.argv[3] === undefined ? 10 : process.argv[3];
const requestLimit = limit < 500 ? limit : 500;

const hostname = 'https://ethereum-rest.api.mnemonichq.com';

const files = {
    financial: 'output-data/financial-data.csv',
    behaviours: 'output-data/behaviours-data.csv',
    tokenOwnership: 'output-data/token-ownership-data.csv'
}

const walletsIds =  [];

async function getFinancialData(offset) {
    const query = new URLSearchParams({
        limit: requestLimit,
        offset
      }).toString();
    
      const resp = await fetch(
        `${hostname}/audiences/v1beta1/financial_profiles/by_collection/${contractId}?${query}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.API_KEY
          }
        }
      );
      const data = await resp.json();
      const parser = new Parser();
      const csv = parser.parse(data.profiles);
      for(let wallet of data.profiles){
        walletsIds.push(wallet.walletAddress);
      }
      console.log('walletsIds: ', walletsIds);
      appendToCSV(files.financial, csv);
      return data.profiles.length;
}

async function getBehaviourData(offset) {
    const query = new URLSearchParams({
        limit: requestLimit,
        offset
      }).toString();
    
      const resp = await fetch(
        `${hostname}/audiences/v1beta1/behaviors/by_collection/${contractId}/details?${query}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.API_KEY
          }
        }
      );
      const data = await resp.json();
      const parser = new Parser();
      const csv = parser.parse(data.walletBehaviors);
      appendToCSV(files.behaviours, csv);
}
//https://ethereum-rest.api.mnemonichq.com/wallets/v1beta2/{walletAddress}/nfts

async function getWalletNFTs(walletAddress) {
    console.log('Getting NFTs for wallet: ', walletAddress);
    let complete = false;
    let offsetNumber = 0;

    const ownership = [];

    while(!complete){
        const query = new URLSearchParams({
            limit: 500,
            offset: offsetNumber
          }).toString();
        
          const resp = await fetch(
            `${hostname}/wallets/v1beta2/${walletAddress}/nfts?${query}`,
            {
              method: 'GET',
              headers: {
                'X-API-Key': process.env.API_KEY
              }
            }
          );
         
          const data = await resp.json();
          if(data.nfts.length < 500){
              complete = true;
          }
          offsetNumber += 500;
          const tokens = new Map;

          for(let nft of data.nfts){
            const contract = nft.nft.contractAddress;
            if(tokens.get(nft.nft.contractAddress) === undefined){
                tokens.set(contract, {
                    walletAddress,
                    contractAddress: contract,
                    collectionName: nft.nft.collection.name,
                    quantity: Number(nft.quantity),
                    spam: nft.spam
                })
            }
            else{
                const token = tokens.get(contract);
                token.quantity +=  Number(nft.quantity);
                token.spam = nft.spam;
                tokens.set(contract, token);
            }
          }
            for(let token of tokens.values()){
                ownership.push(token);
            }
    }

    const parser = new Parser();
    const csv = parser.parse(ownership);
    appendToCSV(files.tokenOwnership, csv);
   
}


function clearCSV() {
    try {
        writeFile(files.behaviours, '', (err)=>{ if (err) throw err; });
        writeFile(files.financial, '', (err)=>{ if (err) throw err; });
        writeFile(files.tokenOwnership, '', (err)=>{ if (err) throw err; });
    } catch (err) {
      console.error(err);
    }
  }

function appendToCSV(fileName, data) {
    try {
      appendFileSync(fileName, data);
    } catch (err) {
      console.error(err);
    }
  }


async function run(){
    clearCSV()

    // Run logic for financial data
    let offset = 0;
    let total = 0;
    while(total < Number(limit)){
        total += await getFinancialData(offset);
        await getBehaviourData(offset);
        offset += requestLimit;
        console.log('total: ', total);
        console.log('limit: ', Number(limit));
    }
    console.log('execute getWalletNFTs');
    for(let walletAddress of walletsIds){
        await getWalletNFTs(walletAddress)
    }

}

await run();
//clearCSV();

