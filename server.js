const express = require("express");
const fetch = require("node-fetch");

const config = require("./config");

const app = express();
const port = 3002;
let prices;
let pairs;
let table;

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
    main();
});

/**
 * The main function will first reset the arrays and fill them after that
 * again by calling the function "BitrueGetAllCurrencyPairs();" with the currency pairs and the associated prices. This happens in "BitrueGetAllCurrencyPairs();"
 * After that the arrays get sorted by "BubbleSort" and stored in
 * tradablePairsSorted.
 * Now the table get created and printed in the console.
 * The function calls itself after its finished.
 *
 * @returns {Promise<void>}
 */
async function main(){
    prices = [];
    pairs = [];
    table = [];

    await BitrueGetAllCurrencyPairs(config.currency);
    let tradablePairsSorted = await BubbleSort(prices,pairs);

    if(pairs.length % 2 === 0){
        for(let i = 0; i < pairs.length/2; i++){
            await createTable(tradablePairsSorted.StockPrices, tradablePairsSorted.StockPairs, i);
        }
    }else{
        for(let i = 0; i < (pairs.length-1)/2; i++){
            await createTable(tradablePairsSorted.StockPrices, tradablePairsSorted.StockPairs, i);
        }
    }
    await printTable(table);

    main();
}


/**
 * Uses the passed data to create a table in the console.
 *
 * @param table
 * @returns {Promise<void>}
 */
async function printTable(table){
    console.clear();
    console.table(table)
}


/**
 *  Fill the array `table` with JSON that contains the table rows.
 *
 * @param price
 * @param pair
 * @param count
 * @returns {Promise<void>}
 */
async function createTable(price, pair, count) {
    //console.log(pair[count], pair[((pair.length-1)-count)]);
    let estProf = await estimatedProfit(pair[count], pair[((pair.length-1)-count)]);
    table[count] = {StockA: pair[count], PriceA: price[count], StockB: pair[((pair.length-1)-count)], PriceB: price[((price.length-1)-count)], Difference: relDif(price[count], price[((price.length-1)-count)]).toFixed(4) + "%", EstimatedProfit : estProf + " $"};
}


/**
 * Just a BubbleSort.
 *
 * @param price
 * @param pair
 * @returns {Promise<JSON>}
 * @constructor
 */
async function BubbleSort(price, pair) {
    return new Promise(async function (resolve) {
        let len = price.length;
        for (let i = len - 1; i >= 0; i--) {
            for (let j = 1; j <= i; j++) {
                if (price[j - 1] > price[j]) {
                    let temp = price[j - 1];
                    price[j - 1] = price[j];
                    price[j] = temp;

                    let temp1 = pair[j - 1];
                    pair[j - 1] = pair[j];
                    pair[j] = temp1;
                }
            }
        }
        resolve({
            StockPrices: price,
            StockPairs: pair
        });
    });
}


async function estimatedProfit(stockA, stockB) {

    let stockAFirst = stockA.split("/"[0])[0];
    let stockASecond = stockA.split("/"[0])[1];

    let stockBFirst = stockB.split("/"[0])[0];
    let stockBSecond = stockB.split("/"[0])[1];

    let estValueAfterTrade;
    let startBalance;

    //todo: create alert when triggerProfit get triggered
    let triggerProfit = config.PercProfitToTrigger;
    let currencyArr = [];

    currencyArr[0] = stockAFirst;
    currencyArr[1] = stockASecond;
    currencyArr[2] = stockBFirst;
    currencyArr[3] = stockBSecond;

    startBalance = (config.DemoAccountValue / 100) * config.PercToTradeWith;

    if (stockASecond.toUpperCase() === "USDT".toUpperCase()) {
        let firstTrade = await BitrueOrderBook(stockAFirst + stockASecond);
        let secondTrade = await BitrueOrderBook(stockBFirst + stockBSecond);
        let thirdTrade = await BitrueOrderBook(stockBSecond + "usdt");

        estValueAfterTrade = ((startBalance / parseFloat(firstTrade.asks[0][0])) * parseFloat(secondTrade.bids[0][0])) * parseFloat(thirdTrade.bids[0][0]);
    } else if (stockBSecond.toUpperCase() === "USDT".toUpperCase()) {
        let firstTrade = await BitrueOrderBook(stockASecond + "usdt");
        let secondTrade = await BitrueOrderBook(stockAFirst + stockASecond);
        let thirdTrade = await BitrueOrderBook(stockBFirst + stockBSecond);

        estValueAfterTrade = await (((startBalance / parseFloat(firstTrade.asks[0][0])) / parseFloat(secondTrade.asks[0][0])) * parseFloat(thirdTrade.bids[0][0]));
    } else {
        let firstTrade = await BitrueOrderBook(stockASecond + "usdt");
        let secondTrade = await BitrueOrderBook(stockAFirst + stockASecond);
        let thirdTrade = await BitrueOrderBook(stockBFirst + stockBSecond);
        let fourthTrade = await BitrueOrderBook(stockBSecond + "usdt");

        estValueAfterTrade = await ((((startBalance / parseFloat(firstTrade.asks[0][0])) / parseFloat(secondTrade.asks[0][0])) * parseFloat(thirdTrade.bids[0][0])) * parseFloat(fourthTrade.bids[0][0]));
    }
    return (estValueAfterTrade - startBalance).toFixed(4);
}

function relDif(stockA, stockB){
    if(stockA > stockB){
        return ((stockA - stockB) / stockB) * 100;
    }else if(stockB > stockA){
        return ((stockB - stockA) / stockA) * 100;
    }else{
        return 0;
    }
}

function diff (num1, num2) {
    let decreaseValue = num1 - num2;
    return (decreaseValue / num1) * 100;
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function BitrueGetStockPrice(stock) {
    return new Promise(async function (resolve, reject) {
        let url = `https://www.bitrue.com/api/v1/ticker/price?symbol=${stock}`;

        async function request() {
            try {
                const req = await fetch(url);
                const response = await req.json();
                resolve(response.price);
            } catch (err) {
                console.log(err);
            }
        }
        await request();
    });
}

/**
 * resolve a list with every currency pair that exist on the exchange
 *
 * @returns {Promise<JSON>}
 * @constructor
 */
async function BitrueGetAllCurrencys(){
    return new Promise(async function (resolve, reject) {
        let url = `https://www.bitrue.com/api/v1/exchangeInfo`;

        async function request() {
            try {
                const req = await fetch(url);
                const response = await req.json();
                resolve(response.symbols);

            } catch (err) {
                console.log(err);
            }
        }
        await request();
    });
}

async function BitrueGetAllCurrencyPairs(searchSymbol) {
    let allSymbols = await BitrueGetAllCurrencys();

    for (let i = 0; i < allSymbols.length; i++) {
        if (allSymbols[i].baseAsset.toUpperCase() === searchSymbol.toUpperCase() && allSymbols[i].quoteAsset.toUpperCase() !== "USDT" /*|| allSymbols[i].quoteAsset.toUpperCase() === searchSymbol.toUpperCase()*/) {
                    let targetPair = await BitrueGetStockPrice(allSymbols[i].quoteAsset + "USDT");
                    let basePair = await BitrueGetStockPrice(allSymbols[i].baseAsset + allSymbols[i].quoteAsset);

                    let convertedToUsdt = (targetPair / (1 / basePair)).toFixed(5);

                    prices.push(convertedToUsdt);
                    pairs.push(allSymbols[i].baseAsset + "/" + allSymbols[i].quoteAsset)
        }
    }

    prices.push(await BitrueGetStockPrice(searchSymbol + "USDT"));
    pairs.push(searchSymbol + "/usdt");

    //removes the pairs from the list that are on the Blacklist
    for(let i = 0; i < pairs.length; i++){
        for(let j = 0; j < config.currencyBlacklist.length; j++){
            if(pairs[i].split("/")[1].toUpperCase() === config.currencyBlacklist[j]){
                pairs.splice(i,1);
                prices.splice(i,1);
            }
        }
    }

}

async function BitrueOrderBook(currency){
    return new Promise(async function (resolve, reject) {
        let url = `https://www.bitrue.com//api/v1/depth?symbol=${currency}`;

        async function request() {
            try {
                const req = await fetch(url);
                const response = await req.json();
                //console.log(response);
                resolve(response);
            } catch (err) {
                console.log(err);
            }
        }
        await request();
    });
}