require('dotenv').config()
const config = require('./config.json');

const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN;
const INITIATION_REGEX = /ajmo+( :([0-9a-z-_]+):)?/;
const UNDER_RADAR_REGEX = new RegExp(config.underRadarRegex);
const GLUP_GO_REGEX = new RegExp(config.samoCosak);
const COSAK_REGEX = new RegExp(config.glupGo);


const SlackBot = require('slackbots');
var bot = new SlackBot({
	token: SLACK_API_TOKEN,
	name: config.botName
});

function postMessage(text, params = {}) {
	params.icon_emoji = params.icon_emoji || config.defaultEmoji;
	return bot.postMessageToGroup(config.slackChannel, text, params);
};

function addListener(eventType, callback) {
	bot.on('message', (event) => {
		if (event.type === eventType) {
			callback(event);
		}
	})
};

function shuffle(array) {
	let j, x, i;
	for (i = array.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = array[i];
		array[i] = array[j];
		array[j] = x;
	}
};

bot.on('start', function () {
	console.log('Bot started.');
});

let msg = null;
let reaction = null;
let initiator = null;
let initiationMessageText = null;
let initiationTime = null;
let oneMorePlayerTimer = null;

addListener('message', (message) => {
	if (message.channel !== config.slackChannelId) return;
	if (!message || !message.text) return;

	// Check if someone wants to play under the radar
	if (message.text.match(UNDER_RADAR_REGEX)) {
		postMessage(`<@${message.user}> *ALO, NEMA ISPOD ŽITA!*`, {icon_emoji: ':stevica:'});
		return;
	}
	if (message.text.match(GLUP_GO_REGEX)) {
		postMessage(`<@${message.user}> *KAKO GLUP GO! 😡*`, {icon_emoji: ':stevica:'});
		return;
	}
	if (message.text.match(COSAK_REGEX)) {
		postMessage(`<@${message.user}> *SAMO COSKARITE! 😡*`, {icon_emoji: ':stevica:'});
		return;
	}
	let match = message.text.match(INITIATION_REGEX);
	if (match) {
		// Check if enough time has passed before initiating again
		let currentTime = new Date();
		if (initiationTime && (currentTime - initiationTime) < config.minimumDelay * 1000) {
			postMessage(`<@${message.user}> Sačekaj još ${Math.round((config.minimumDelay * 1000 - (currentTime - initiationTime)) / 1000)} sekundi brt.`);
			return;
		}
		reaction = match[2] || config.defaultEmoji;
		// TODO: Check if the reaction actually exists (not just if it is present) before continuing
		// Create the initiation message
		initiator = message.user;
		initiationTime = currentTime;
		initiationMessageText = `<!here> Ajmoooo zglobeeex! :${reaction}: (<@${initiator}>)`;
		postMessage(initiationMessageText);
	}

	// Set initiation message object and add the first reaction to the message
	if (message.text === initiationMessageText) {
		msg = message;
		bot._api('reactions.add', {channel: msg.channel, timestamp: msg.ts, name: reaction});
	}
});

// Test if there are enough reactions
addListener('reaction_added', () => {
	if (!msg) return;
	bot._api('reactions.get', {channel: msg.channel, timestamp: msg.ts})
		.then(res => {
			// Get the number of reactions
			let reactions = res.message.reactions;
			let reactionObj = reactions.find(r => r.name === reaction);

			// If there's only one player missing for the game, set the one more player timer
			if (reactionObj.count === 3 && !oneMorePlayerTimer) {
				oneMorePlayerTimer = setTimeout(() => {
					postMessage('<!here> još 1');
				}, config.oneMoreTimeout);
			}
			// If we have enough players, announce the game!
			else if (reactionObj.count >= 4) { // 3 players + bot
				clearTimeout(oneMorePlayerTimer); // Prevent sending one more player message
				let players = reactionObj.users.slice(1).concat([initiator]); // Remove bot from players and add initiator
				let mentionPlayers = players.map(player => `<@${player}>`);
				shuffle(mentionPlayers);
				postMessage('Idemooooo!!!', {
					attachments: [
						{
							fallback: 'Crveni',
							color: '#ff0000',
							text: `Napad: ${mentionPlayers[0]} \nOdbrana: ${mentionPlayers[1]}`
						},
						{
							fallback: 'Plavi',
							color: '#0000ff',
							text: `Napad: ${mentionPlayers[2]} \nOdbrana: ${mentionPlayers[3]}`
						}
					]
				});
				// If the response time was very fast, post the special message
				const timeSinceInitiation = new Date() - initiationTime;
				if (initiationTime && timeSinceInitiation < 5000) {
					postMessage(`${timeSinceInitiation / 1000}sec fantaaazija :bajdra:`);
				}
				msg = null;
			}
		});
});