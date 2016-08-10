const {RtmClient, RTM_EVENTS} = require('@slack/client');
const Rx = require('rx');

const token = process.env.SLACK_API_TOKEN;
const principalUser = process.env.MASTER_ID;

const rtm = new RtmClient(token, {logLevel: 'warning'});
rtm.start();

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

class Filter {
  constructor(regex, apply) {
    this.regex = regex;
    this.apply = apply;
  }

  execute(word) {
    var match;
    if (match = word.text.match(this.regex)) {
      word.filtered = true;
      word.output.push(this.apply(word, match))
    }
    return word;
  }
}

const wordsFilters = {
  di: new Filter(/di(\S+)/i, (word, match) => `'${match[1]}`),
  cri: new Filter(/cri(\S+)/i, (word, match) => match[1].toUpperCase()),
  scand: new Filter(/scand(\S+)/i, (word, match) => `${match[1].toUpperCase()} ! ${match[1].toUpperCase()} ! ${match[1].toUpperCase()} !`),
  pri: new Filter(/pri(\S+)/i, (word, match) => `:pray: ${match[1]} :pray:`)
}

var applyFilter = true;

const values = (obj) => Object.keys(obj).map(key => obj[key]);

const changeFilter = (newValue, acceptFilterCallback = () => {}, disableFilterCallback = () => {}) => {
  newValue ? acceptFilterCallback() : disableFilterCallback();
  return initialValue;
}

const authorizedUser = (user, unauthorizedCallback = () => {}) => {
  if (user !== principalUser) {
    unauthorizedCallback();
    return false;
  }
  return true;
}

const executeCommand = ({text, channel}) => {
  switch (true) {
    case /bot filter ?= ?(true|false).*/i.test(text):
      newValue = (/bot filter ?= ?(true|false).*/i.exec(text)[1].toLowerCase() === 'true');
      applyFilter = newValue;
      newValue ? rtm.sendMessage("Cool :smirk:", channel) : rtm.sendMessage("Ok ... j'arrete :cry:", channel);
      break;
    case /bot config/.test(text):
      rtm.sendMessage(`Apply filter status : ${applyFilter}\nConfigured filters : ${Object.keys(wordsFilters).join(" ")}`, channel);
      break;
  }
};

const messageSubject = new Rx.Subject();
messageSubject
  .filter(message => applyFilter)
  .flatMap(({text, channel}) => Rx.Observable.from(text.split(" ").map(word => ({word: word, channel: channel}))))
  .map(({word, channel}) => values(wordsFilters).reduce((word, filter) => filter.execute(word), {text: word, channel: channel, filtered: false, output: []}))
  .filter(word => word.filtered)
  .subscribe(filteredWord => rtm.sendMessage(filteredWord.output.join(" "), filteredWord.channel));

const configurationMessage = new Rx.Subject();
configurationMessage
  .filter(({user, channel}) => authorizedUser(user, () => rtm.sendMessage('Seul mon maitre à le droit de me donner des ordres')))
  // .map(message => createCommand(message))
  .subscribe(message => executeCommand(message));


rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  if (message.text.contains("bot")) {
    configurationMessage.onNext(message);
  } else {
    messageSubject.onNext(message);
  }
});
