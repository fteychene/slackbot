# Slackbot
Stupid slackbot to add fun.
This bot is a simple message analyzer that use filters to respond.

The bot has two kind of configuration :
 * Commands : commands are actions in response to a message prefixed by bot and can be restricted to a specific user to manage th bot.
 * Filters : filter are configured response to messages when a regex is applying.


## Docker
To run this bot on you Slack team :
`docker run -d -e SLACK_API_TOKEN={your_salck_bot_token} -e MASTER_ID={slack_user_id} fteychene/slackbot:latest`

## Filters

Filter are currently some word modifications based on French language.

Currently the filters are :
 * Di : When a word contains di* or dy* it respond the rest of the word (ex : distance => stance)
 * Cri : When a word contains cri* it respond the rest of the word as shout (ex : critique => TIQUE)
 * Pri : When a word contains pri* it response the rest of the word as a pray (ex : prison : :pray: son :pray:)
 * scand : When a word contains scand* it respons the rest of the word as a slogan (ex : scandaleux : ALEUX ! ALEUX ! ALEUX !)

## Commands

The command are actions to change the behavior or the bot (stop/start applying filter, display current configuration).

Currently the commands are :
 * bot config : Display the current state of the bot config
 * bot filter = (true|false) : Modify the application of the filters (if true the bot will respond with filters on message) *Restricted Command*
 * bot {key} = {value} : Store the key and value.
 * bot {key} ? : Display the value of a key
