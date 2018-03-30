const SlackBot = require('slackbots');

const bot = new SlackBot({
	token: 'xoxb-338114360626-C2vfy10HVbY27N1UI7UpwDeZ',
	name: 'Zglobex Bot'
});

const postMessage = (text, params = {}) => {
	params.icon_emoji = params.icon_emoji || ':zglobex:';
	return bot.postMessageToGroup('zglobex-bot-develop', text, params);
};

const addListener = (eventType, callback) => {
	bot.on('message', (event) => {
		if (event.type === eventType) {
			callback(event);
		}
	})
};

const shuffle = array => {
	let j, x, i;
	for (i = array.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = array[i];
		array[i] = array[j];
		array[j] = x;
	}
};

bot.on('start', function () {
	console.log('bot started');
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

const MINIMUM_DELAY = 30 * 1000; // 30 seconds delay between initiating parties
const INITIATION_REGEX = /ajmo+ :(\S+):/i;
const NENAD = 'U5MN91MCL';
const ONE_MORE_TIMEOUT = 10 * 1000; // 10 seconds before sending @here jos 1

let msg = null;
let reaction = null;
let initiator = null;
let initiationMessageText = null;
let initiationTime = null;
let oneMoreTimer = null;

addListener('message', (message) => {
	if (!message || !message.text) return;

	// Check if someone wants to play under wheat
	if (message.text.match(/ispod zita/)) {
		postMessage(`<@${message.user}> *ALO NEMA ISPOD ZITA*`, {icon_emoji: ':stevica:'});
		return;
	}
	// Test if message is in valid format and set it as initiation message
	const match = message.text.match(INITIATION_REGEX);
	if (match) {
		// Check if enough time has passed before initiating again
		const currentTime = new Date();
		if (initiationTime && (currentTime - initiationTime) < MINIMUM_DELAY) {
			postMessage(`<@${message.user}> Sacekaj jos ${Math.round((MINIMUM_DELAY - (currentTime - initiationTime)) / 1000)} sekundi brt.`);
			return;
		}
		// TODO: check if emoji exists (try to add it to a message and if it works, remove it immediately)
		reaction = match[1];
		initiator = message.user;
		initiationTime = new Date();
		initiationMessageText = `<!here> Ajmoooo zglobeeex! :${reaction}: (<@${initiator}>)`;
		postMessage(initiationMessageText);
	}

	// Set initiation message object and add first reaction to the message, and pin it
	if (message.text === initiationMessageText) {
		msg = message;
		bot._api('reactions.add', {channel: msg.channel, timestamp: msg.ts, name: reaction});
		bot._api('pins.add', {channel: msg.channel, timestamp: msg.ts});
	}
});

// Test if there is enough reactions
addListener('reaction_added', () => {
	if (!msg) return;
	bot._api('reactions.get', {channel: msg.channel, timestamp: msg.ts})
		.then(res => {
			// If there are enough reactions, start the game
			const reactions = res.message.reactions;
			const reactionObj = reactions.find(r => r.name === reaction);
			if (reactionObj.count === 3 && !oneMoreTimer) {
				oneMoreTimer = setTimeout(() => {
					postMessage('<!here> jos 1');
				}, ONE_MORE_TIMEOUT);
			}

			// Start the game!
			if (reactionObj.count >= 4) { // 3 players + bot
				clearTimeout(oneMoreTimer); // prevent sending @here jos 1
				const players = reactionObj.users.slice(1).concat([initiator]); // remove bot from players and add initiator
				const mentionPlayers = players.map(player => {
					if (player === NENAD) {
						return `<@${player}> sssssone`
					}
					return `<@${player}>`;
				});
				shuffle(mentionPlayers);
				postMessage('idemooooo!!!', {
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
				// Bajdra
				const timeSinceInitiation = new Date() - initiationTime;
				if (initiationTime && timeSinceInitiation < 5000) {
					postMessage(`${timeSinceInitiation / 1000}sec fantaaazija`, {icon_emoji: ':bajdra:'});
				}
				// Remove pin and reset msg object
				bot._api('pins.remove', {channel: msg.channel, timestamp: msg.ts});
				msg = null;
			}
		});
});