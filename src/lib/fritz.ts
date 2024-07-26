import { getTopics } from "../lib/google-sheet";
import { getSecret, SSMParameter } from "../lib/ssm";
import { sendMessageWithButtons, sendMessage } from "../lib/telegram";

export const handleMessage = async (input: FritzInput) => {

  // get the bot token from AWS SSM
  const token = await getSecret(SSMParameter.FritzBotToken);

  // destructure the input object
  const { chatId, text, command } = input;

  // if the command is present, fetch the topics from the Google Sheet
  if (command) {
    const topics = await getTopics();
    const text = 'Select a topic:';
    await sendMessageWithButtons({ chatId, text, token, items: topics });
  }
  // if the command is not present, send a welcome message
  else {
    await sendMessage({ chatId, text: 'Hello, I am Fritz Bot', token });
  }
}