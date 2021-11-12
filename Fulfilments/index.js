// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const axios= require('axios');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
    
    function getSpreadSheetData(){
        return axios.get('https://sheetdb.io/api/v1/dq8dguol1a2h2'); 
    }
    
    function SearchProduct(agent){  
        const product = agent.parameters.product.toLowerCase();
        const site = agent.parameters.site;
        var text_response = `${product} is currently not available.`;

        return getSpreadSheetData().then(res => {
            res.data.map(per => {
                if (site.length > 0) {
                    if (per.Name.toLowerCase() === product && per.Site.toLowerCase() == site.toLowerCase()) {
                        text_response = `${product} is available on ${per.Site} `;
                        if (per.discounted_price !== "") {
                            text_response += `at discounted price of rupees ${parseInt(per.discounted_price)}, original price was rupees ${parseInt(per.original_price)}.`;
                        }
                        else {
                            text_response += `at rupees ${parseInt(per.original_price)}.`;
                        }
                    }
                } 
                else {
                    if(per.Name.toLowerCase() === product){
                        text_response = `${product} is available on ${per.Site} `;
                        if (per.discounted_price !== "") {
                            text_response += `at discounted price of rupees ${parseInt(per.discounted_price)}, original price was rupees ${parseInt(per.original_price)}.`;
                        }
                        else {
                            text_response += `at rupees ${parseInt(per.original_price)}.`;
                        }
                    }
                }
            });	
            text_response += ` What else I can help?`;
            agent.add(text_response);
        });
    }


    function SellPurchaseProduct(agent){  
        const category = agent.parameters.category.toLowerCase();
        const site = agent.parameters.site;
        var discountedPrice = 0;
        var originalPrice = 0;
        var total_product = 0;
        var text_response = `No record found for ${category}.`;
        var if_site_text = ``;

        return getSpreadSheetData().then(res => {
            res.data.map(per => {
                if (site.length > 0) {
                    if (per.Category.toLowerCase() === category && per.Site.toLowerCase().replace(" ","") == site.toLowerCase().replace(" ","").replace(".com","")) {
                        if_site_text = `at ${site}`;
                        total_product += 1;
                        if (per.discounted_price !== "" && per.original_price !== "") {
                            discountedPrice = discountedPrice + parseInt(per.discounted_price);
                            originalPrice = originalPrice + parseInt(per.original_price);
                        }
                        else if (per.original_price !== "") {
                            originalPrice = originalPrice + parseInt(per.original_price);
                        }
                    }
                } 
                else {
                    if(per.Category.toLowerCase() === category){
                        total_product += 1;
                        if (per.discounted_price !== "" && per.original_price !== "") {
                            discountedPrice = discountedPrice + parseInt(per.discounted_price);
                            originalPrice = originalPrice + parseInt(per.original_price);
                        }
                        else if (per.original_price !== "") {
                            originalPrice = originalPrice + parseInt(per.original_price);
                        }
                    }
                }
            });	
            if (discountedPrice === 0) {
                const original_avg_price = originalPrice / total_product;
                text_response = `On average price of ${category} ${if_site_text} is rupees ${parseInt(original_avg_price)}. Currently there is no discount on ${category}.`;
            }
            else {
                const original_avg_price = originalPrice / total_product;
                const discounted_avg_price = discountedPrice / total_product;
                text_response = `On average discounted price of ${category} ${if_site_text} is rupees ${parseInt(discounted_avg_price)}, Original average price is rupees ${parseInt(original_avg_price)}.`;
            }
            text_response += ` What else I can search for you?`;
            agent.add(text_response);
        });
    }

  
    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }
 
    function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
    }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('Product Price', SearchProduct);
    intentMap.set('Sell Purchase Product', SellPurchaseProduct);
    // intentMap.set('your intent name here', yourFunctionHandler);
    // intentMap.set('your intent name here', googleAssistantHandler);
    agent.handleRequest(intentMap);
});