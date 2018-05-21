/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');

const request = require('request')
const rp = require('request-promise');
const http = require('http');
const AWS = require('aws-sdk');


// the timeout for the external requests towards kmirobot
const TIMEOUT_MS = 3000
const HURIC_URI = process.env['HURIC_URI']
// 'http://137.108.125.184:5000/nlu-interface'

AWS.config.update({region: 'eu-west-1'});
const lexruntime = new AWS.LexRuntime();

const expand_spatial = (string, slots_by_name) => {
  var params = {
    botAlias: 'latest', /* required, has to be '$LATEST' */
    botName: 'spatial', /* required, the name of you bot */
    inputText: string, /* required, your text */
    userId: 'USER', /* required, arbitrary identifier */
  };
  return lexruntime.postText(params).promise().then(response => {
    if (response.intentName == 'Spatial_relation') {
      const slots = response.slots;
      for (const k in slots) {
        slots_by_name[k] = slots[k];
      }
      //Object.assign(slots_by_name, slots);
      return slots;
    } else {
      return null;
    }
  });
};

const huric_post = (req) => {
  const options = {
    method: 'POST',
    uri: HURIC_URI,
    body: req,
    json: true,
    timeout: TIMEOUT_MS
  }
  return rp(options).then((raw_response) => {
    console.log('request OK')
    return raw_response.data || raw_response;
  }).catch((error) => {
    console.log('request error:' + error)
    return 'error in communication: ' + error;
  });
};

const HuricHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    //return true;
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && ["Attaching", "Being_in_category", "Being_located", "Bringing", "Change_operational_state", "Closure", "Entering", "Following", "Giving", "Inspecting", "Motion", "Perception_active", "Placing", "Releasing", "Searching", "Taking"].includes(request.intent.name));
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    
    let result_str;
    let res;
    
    let promises = [];
    const slots_by_name = {};
    let huric_response = null;
    
    if (request.intent) {
      const slots = request.intent.slots;
      
      for (const i in request.intent.slots) {
        slots_by_name[slots[i].name] = slots[i].value;
      }
      result_str = 'Intent:' + request.intent.name + ' ' ;
      const huric_promise = huric_post(request).then((res) => {
        huric_response = res;
      });
      promises.push(huric_promise);
      switch (request.intent.name) {
        case 'Attaching':
          res = 'I would connect or disconnect if only I had hands! '; //+ huric_post(null);
          break;
        case 'Being_in_category':
          res = 'Thanks for telling me that ' + slots_by_name['Item'] + ' is a ' + slots_by_name['Category'];
          break;
        case 'Being_located':
          res = 'Now I know that ' + slots_by_name['Theme'] + ' is located ' + slots_by_name['Location'] + '. Great!';
          break;
        case 'Bringing':
          let theme = slots_by_name['Theme'];
          let lex_promise = expand_spatial(theme, slots_by_name);
          promises.push(lex_promise.then((lex_response) => {
            if (lex_response) {
              theme = lex_response.Trajector;
              res = 'I can\'t take ' + lex_response.Trajector + ' but you can come with me ' + lex_response.Spatial_Indicator + ' ' + lex_response.Landmark;
            } else {
              res = 'I would bring ' + theme + ', but I can\'t grab it';
            }
            return;
          }));
          break;
        case 'Change_operational_state':
          res = 'How can I turn it ' + slots_by_name['Operational_state'] + ' without hands?';
          break;
        case 'Closure':
          res = 'I don\'t have hands to open and close things!';
          break;
        case 'Entering':
          res = 'I would enter ' + slots_by_name['Goal'] + ' if i knew where it is';
          break;
        case 'Following':
          res = 'Go ahead! I will follow you';
          break;
        case 'Giving':
          res = 'Hmm to take ' + slots_by_name['Theme'] + ' I should grab it, but I cannot do that!';
          break;
        case 'Inspecting':
          if (slots_by_name['Desired_state']) {
            res = 'Let me check if ' + slots_by_name['Ground'] + slots_by_name['Desired_state'];
          } else {
            res = 'Let me check ' + slots_by_name['Ground'];
          }
          break;
        case 'Motion':
          res = 'My destination is ' + slots_by_name['Goal'] + '. See you later!';
          break;
        case 'Perception_active':
          res = 'Contemplating...';
          break;
        case 'Placing':
          res = 'I cannot pick objects for now!';
          break;
        case 'Releasing':
          res = 'Well really am I holding ' + slots_by_name['Theme'] + '? I thought I had no grasping abilities!';
          break;
        case 'Searching':
          res = 'I will never be able to find' + slots_by_name['Phenomenon'];
          break;
        case 'Taking':
          res = 'Come with me, I cannot take ' + slots_by_name['Theme'];
          break;
        
            
        default:
          // code
          res = 'I have no further instruction on how to process the intent ' + request.intent.name;
      }
    } else {
      result_str = res = '<prosody pitch="high">Hello</prosody>. I am the office robot! Please ask me something';
    }

    return Promise.all(promises).then((resolved_promises) => {
      result_str += 'huric_response:' + JSON.stringify(huric_response) + ', '
      for(const k in slots_by_name) {
        const value = slots_by_name[k];
        if (value) {
          result_str += k + ':' + value + ', ';
        }
      }
      return handlerInput.responseBuilder
        .speak(res)
        // let the session open
        .withShouldEndSession(false)
        .withSimpleCard(SKILL_NAME, result_str)
        .getResponse();
    });
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(STOP_MESSAGE)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.speak('Goodbye!').getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(error);

    return handlerInput.responseBuilder
      .speak(`Sorry, an error occurred: ${error} - ${error.lineNumber}` )
      .reprompt('Sorry, an error occurred.')
      .getResponse();
  },
};

const SKILL_NAME = 'office robot';
const HELP_MESSAGE = 'You can ask me to go somewhere or check things in the office, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';


const skillBuilder = Alexa.SkillBuilders.standard();

const test_fn = () => {
  huric_post({'some': 'data'}).then((res) => {
    console.log(res);
  });
}

exports.handler = skillBuilder
  .addRequestHandlers(
    HuricHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

exports.test = test_fn;

// test_fn()