const {RtmClient, RTM_EVENTS} = require('@slack/client');
const Rx = require('rx');

const token = process.env.SLACK_API_TOKEN;
const principalUser = process.env.MASTER_ID;

const rtm = new RtmClient(token, {logLevel: 'info'});
rtm.start();

String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

const authorizedUser = (user, unauthorizedCallback = () => {}) => {
  if (user !== principalUser) {
    unauthorizedCallback();
    return false;
  }
  return true;
}

const filter = ({regex, apply}) => {
  return (word) => {
    let match;
    if (match = word.text.match(regex)) {
      word.filtered = true;
      word.output.push(apply(match))
    }
    return word;
  }
}

const command = ({regex, apply, restricted = false, extractor = (regex, text) => []}) => {
  return ({text, user, channel}) => {
    if (regex.test(text)) {
      if (!restricted || authorizedUser(user, () => rtm.sendMessage('Seul mon maitre à le droit de me donner des ordres', channel))) {
        apply(channel, ...extractor(regex, text));
      }
    }
  }
}

let applyFilter = true;

const filters = {
  di: filter({regex: /d[iy](\S+)/i, apply: (match) => `${match[1]}`}),
  cri: filter({regex: /cri(\S+)/i, apply: (match) => match[1].toUpperCase()}),
  scand: filter({regex: /scand(\S+)/i, apply: (match) => `${match[1].toUpperCase()} ! ${match[1].toUpperCase()} ! ${match[1].toUpperCase()} !`}),
  pri: filter({regex: /pri(\S+)/i, apply: (match) => `:pray: ${match[1]} :pray:`})
}

const commands = {
  config: command({
    regex: /bot config/,
    apply: (channel) => rtm.sendMessage(`Apply filter status : ${applyFilter}\nConfigured filters : ${Object.keys(filters).join(" ")}`, channel),
    restricted: false}),
  filter: command({
    regex: /filter\s*=\s*(true|false).*/i,
    extractor: (regex, text) => [regex.exec(text)[1].toLowerCase() === 'true'],
    apply: (channel, value) => {
      applyFilter = value;
      value ? rtm.sendMessage("Cool :smirk:", channel) : rtm.sendMessage("Ok ... j'arrete :cry:", channel);
    },
    restricted: true}),
}

const values = (obj) => Object.keys(obj).map(key => obj[key]);

const messageSubject = new Rx.Subject();
messageSubject
  .filter(message => applyFilter)
  .flatMap(({text, channel}) => Rx.Observable.from(text.split(" ").map(word => ({word: word, channel: channel}))))
  .map(({word, channel}) => values(filters).reduce((word, aFilter) => aFilter(word), {text: word, channel: channel, filtered: false, output: []}))
  .filter(word => word.filtered)
  .subscribe(filteredWord => rtm.sendMessage(filteredWord.output.join(" "), filteredWord.channel));

const configurationMessage = new Rx.Subject();
configurationMessage
  .filter(({user, channel}) => authorizedUser(user, () => rtm.sendMessage('Seul mon maitre à le droit de me donner des ordres', channel)))
  .subscribe(message => values(commands).forEach(aCommand => aCommand(message)));

rtm.on(RTM_EVENTS.MESSAGE, (message) => {
  if (message.text) {
    if (message.text.startsWith("bot")) {
      configurationMessage.onNext(message);
    } else {
      messageSubject.onNext(message);
    }
    if (message.text.contains("userid")) {
      rtm.sendMessage(message.user, message.channel);
    }
  }
});
