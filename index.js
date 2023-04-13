import { Parser } from '@json2csv/plainjs';
import { appendFileSync } from 'fs';
import * as dotenv from 'dotenv'
import {ux} from '@oclif/core'  //https://github.com/oclif/core/blob/main/src/cli-ux/README.md

dotenv.config()

const contractId = process.argv[2];
const limit = process.argv[3] === undefined ? 10 : process.argv[3];

const files = {
    financial: 'output-data/financial-data.csv',
    behaviours: 'output-data/behaviours-data.csv'
}

async function getFinancialData(contract) {
    const query = new URLSearchParams({
        limit: '10',
        offset: '0'
      }).toString();
    
      const contractAddress = contract;
      const resp = await fetch(
        `https://ethereum-rest.api.mnemonichq.com/audiences/v1beta1/financial_profiles/by_collection/${contractAddress}?${query}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.API_KEY
          }
        }
      );
    
      const data = await resp.json();
      console.log(data);
      const parser = new Parser();
      const csv = parser.parse(data.profiles);
      appendToCSV(files.financial, csv);
    }

function clearCSV() {
    try {
      appendFileSync(files.behaviours, '');
      appendFileSync(files.financial, '');
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


