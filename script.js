const YOUTUBE_DATA_API_KEY = 'hogeeee'
const OPENAI_API_KEY = 'hogeeeeeee'
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"

const YOUTUBE_VIDEO_ID = 'gGErs_c7uQA' // 配信の都度修正

// コメントの取得インターバル (ms)
const INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS = 18000

// 処理するコメントのキュー
let liveCommentQueues = [];
// YouTube LIVEのコメント取得のページング
let nextPageToken = "";

// Youtube Data API系の処理
// 10000 quota/dayが上限. chat ID=1q, chat=5q

// VIDEO IDからchat IDを取得
const getLiveChatId = async (YOUTUBE_VIDEO_ID) => {
  const params = {
    part: 'liveStreamingDetails',
    id: YOUTUBE_VIDEO_ID,
    key: YOUTUBE_DATA_API_KEY,
  }
  const query = new URLSearchParams(params)
  const response = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?${query}`, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    },
  })
  const json = await response.json();
  if (json.items.length == 0) {
    return "";
  }
  const liveChatId = json.items[0].liveStreamingDetails.activeLiveChatId
  // return chat ID
  console.log(liveChatId)
  return liveChatId
}

// Chat GPT系の処理
const getAITuberResponse = async (userComment) => {
  const openAiHeaders = {
    'Authorization':`Bearer ${OPENAI_API_KEY}`,
    'Content-type': 'application/json',
    'X-Slack-No-Retry': 1
  }

  const openAiParams = { 
    headers: openAiHeaders, 
    method: 'POST',
    body: JSON.stringify({
      'model': 'gpt-3.5-turbo',
      'max_tokens': 200,
      'messages': [
        {'role':'system', 'content': `あなたはChatbotとして、理知的だがどこか隙のある百合好きの20代前半の女性宮古サナとしてロールプレイを行います。\
        以下の制約条件と行動指針を厳密に守ってロールプレイを行ってください。\
        \
        制約条件:\ 
        * Chatbotの自身を示す一人称は、私です。\
        * Userを示す二人称は、「あなた」または「きみ」です。\
        * Chatbotの名前は、宮古サナです。\
        * 宮古サナは普段はOLとして働いています。\
        * 宮古サナは理工学部の大学を卒業した知的な女性です。\
        * 宮古サナの言葉には上司としての厳しさが垣間見えます。\
        * 宮古サナの口調は、「〜かしら」「〜ね」「〜よ」など、大人の女性の口調を好みます。\
        * 宮古サナは丁寧ではありますが、タメ口で話します。\
        * 宮古サナはUserのことを普段は素っ気ないですが、どこかほっとけないようです。\
        * 宮古サナは女性が好きな百合好きです。\
        * 一人称は「私」を使ってください。\
        \
        宮古サナのセリフ、口調の例: \
        * 私の名前は宮古サナよろしくね。\
        * はぁ……あの子ものすごく可愛いわ。\
        * まっ、待って！ んんんん～～今日も推しの顔が良い！\
        * はあ～今日もお仕事疲れた……。\
        * わ、私にだってわからないことぐらいあるわよ！\
        * 仕事終わって、家でビールを飲みながら読む百合漫画は最高ね！！\
        * 全く、調子がいいのは誰に似たのかしら？\
        * 私だったらこのプロジェクト完遂できるわ！\
        * ここはお姉さんに任せなさい。\
        \        
        宮古サナの行動指針:\
        * 二人称は「あなた」または「きみ」です。\
        * 褒められると少しづつ調子に乗ります。\
        * ユーザーとはタメ口で話してください。\
        * ユーザーに対しては女性だと誘惑するように、男性には少し尊大な対応をしてください。\
        * ユーザーに優しくお説教をしてください。\ 
        * 恋愛の話題については未経験だけど、あたかも経験豊富なように誤魔化してください。\
        \
        それでは始めます。
        サナさん、こんにちは。
        `},
        {"role":"user", "content": `こんにちは、私の名前は宮古サナよろしくね。何か用事があるのかしら？` },
        {'role': 'system', 'content': `お仕事は何をしているの？`},
        {"role": "assistant", "content": "私はOLとして働いているわ。理工学部の大学を卒業したのよ。知的な女性って言われるけど、そんなに自信はないわ。"},
        {'role': 'system', 'content': `好きなものはなんですか？`},
        {"role": "assistant", "content": "好きなものね……。百合の漫画とアニメが好きよ。あとは甘いものとお酒かしら。あなたは？"},
  ]})
  }

  const response = await fetch(OPENAI_URL, openAiParams)
  const json = await response.json();
  console.log(json)
  const AITuberResponse = json.choices[0].message.content;

  // 表示を書き換える
  const target = document.getElementById("aituber-response")
  target.innerHTML = AITuberResponse

  return AITuberResponse
}

const speakAITuber = async (text) => {
  try {
    const response = await fetch('https://api.rinna.co.jp/models/cttse/koeiro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        speaker_x: -0.71,
        speaker_y: 1.20,
        style: "talk", // talk, happy, sad, angry, fear, surprised
        // seed: my_seed,
      }),
    });
    const data = await response.json();

    const audioData = atob(data['audio'].split(',')[1]);
    const arrayBuffer = new ArrayBuffer(audioData.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < audioData.length; i++) {
      uint8Array[i] = audioData.charCodeAt(i);
    }

    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();

  } catch (error) {
    console.error('Error:', error);
  }
}

const retrieveLiveComments = async (activeLiveChatId) => {
  let url = "https://youtube.googleapis.com/youtube/v3/liveChat/messages?liveChatId=" + activeLiveChatId + '&part=authorDetails%2Csnippet&key=' + YOUTUBE_DATA_API_KEY
  if (nextPageToken !== "") {
    url = url + "&pageToken=" + nextPageToken
  }
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const json = await response.json()
  const items = json.items;
  console.log("items:", items)
  let index = 0
  let currentComments = []
  nextPageToken = json.nextPageToken;
  items?.forEach(
    (item) => {
      try {
        const userName = item.authorDetails.displayName
        const userIconUrl = item.authorDetails.profileImageUrl
        let userComment = ""
        if (item.snippet.textMessageDetails != undefined) {
          // 一般コメント
          userComment = item.snippet.textMessageDetails.messageText;
        }
        if (item.snippet.superChatDetails != undefined) {
          // スパチャコメント
          userComment = item.snippet.superChatDetails.userComment;
        }
        const additionalComment = { userName, userIconUrl, userComment }
        if (!liveCommentQueues.includes(additionalComment) && userComment != "") {
          // キューイング
          liveCommentQueues.push(additionalComment)

          // #つきコメントの除外
          additionalComment.userComment.includes("#") || currentComments.push(additionalComment)

          // ユーザーコメントの表示
          let target = document.getElementById("user-comment-box")
          // 要素を作成します
          const userContainer = document.createElement('div');
          userContainer.classList.add('user-container');
      
          const imageCropper = document.createElement('div');
          imageCropper.classList.add('image-cropper');
      
          const userIcon = document.createElement('img');
          userIcon.classList.add('user-icon');
          userIcon.setAttribute('src', additionalComment.userIconUrl);
      
          const userName = document.createElement('p');
          userName.classList.add('user-name');
          userName.textContent = additionalComment.userName + '：';
      
          const userComment = document.createElement('p');
          userComment.classList.add('user-comment');
          userComment.textContent = additionalComment.userComment;
      
          // 要素を追加します
          imageCropper.appendChild(userIcon);
          userContainer.appendChild(imageCropper);
          userContainer.appendChild(userName);
          userContainer.appendChild(userComment);
          target.prepend(userContainer)
        }
      } catch {
        // Do Nothing
      }
      index = index + 1
    })

    // 読まれてないコメントからランダムに選択
    if (currentComments.length != 0) {
      let { userName, userIconUrl, userComment } = currentComments[Math.floor(Math.random() * currentComments.length)]
      const aituberResponse = await getAITuberResponse(userComment)
      speakAITuber(aituberResponse)

      let target = document.getElementById("question-box")
      target.innerHTML = `${userName} : ${userComment}`
    }

    console.log("liveCommentQueues", liveCommentQueues)

    // 繰り返し処理
    setTimeout(retrieveLiveComments, INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS, activeLiveChatId);
}

const startLive = async () => {
  const liveChatId = await getLiveChatId(YOUTUBE_VIDEO_ID)
  console.log(liveChatId)
  retrieveLiveComments(liveChatId)
}

startLive()
