import React, { Component } from 'react';
import './App.css';
import axios from 'axios';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {url: '', transcripts: '', messageText: ''};
    this.handleUrlChange = this.handleUrlChange.bind(this);
  }

  handleUrlChange(event) {
    const newUrl = event.target.value;
    this.setState({url: newUrl});
    axios.get(newUrl)
      .then(response => {
        const regExpID = /"talk_id":(\d+)/;
        const m = response.data.toString().match(regExpID);
        if (!m) throw new Error('fail to get talk id');
        const id = m[1];

        const regExpTitle = /<title>(.+)<\/title>/;
        const mtitle = response.data.toString().match(regExpTitle);
        const title = mtitle ? mtitle[1] : '** no title **';

        return [id, title];
      })
      .then(([talkID, title]) => {
        const transcriptEnUrl = `https://www.ted.com/talks/${talkID}/transcript.json?language=en`;
        const transcriptJaUrl = `https://www.ted.com/talks/${talkID}/transcript.json?language=ja`;
        return axios.all([
            title,
            axios.get(transcriptEnUrl),
            axios.get(transcriptJaUrl)
        ]);
      })
      .then(axios.spread((title, responseEn, responseJa) => {
        this.setState({
          transcripts: {
            title: title,
            en: responseEn.data,
            ja: responseJa.data
          }
        });
      }))
      .catch(error => {
        this.setState({messageText: error.toString()});
      });
  }

  render() {
    return (
      <div>
        <input id="url" value={this.state.url} onChange={this.handleUrlChange}/>
        <p>{this.state.messageText}</p>
        <p id="title">{this.state.transcripts.title}</p>
        <Transcripts2 transcripts={this.state.transcripts} />
      </div>
    );
  }
}

function cuesToText(cues) {
  return cues.reduce((acc, current) => acc + ' ' + current.text, "");
}

function changeTranscripts(scripts) {
  const newScripts = [];
  const enLength = scripts.en.paragraphs.length;
  const jaLength = scripts.ja.paragraphs.length;

  let iEn = 0;
  let iJa = 0;
  while (iEn < enLength || iJa < jaLength) {
    const paragraphEn = iEn < enLength ? scripts.en.paragraphs[iEn].cues : [];
    const paragraphJa = iJa < jaLength ? scripts.ja.paragraphs[iJa].cues : [];

    if (ptime(paragraphEn) === ptime(paragraphJa)) {
      newScripts.push({
        en: paragraphEn,
        ja: paragraphJa
      });
      iEn++;
      iJa++;
      continue;
    }
    if (ptime(paragraphEn) < ptime(paragraphJa)) {
      newScripts.push({
        en: paragraphEn,
        ja: []
      });
      iEn++;
      continue;
    }

    newScripts.push({
      en: [],
      ja: paragraphJa
    });
    iJa++;
  }

  return newScripts;
}

function ptime(paragraph) {
  if (paragraph.length === 0) return Infinity;
  return Math.floor(paragraph[0].time / 1000);
}

function Paragrahs(props) {
  const content = props.content.map(p => {
    return (
      <p>
        <span class="time">[{formatTime(p[0].time)}]</span>
        {cuesToText(p)}
      </p>
    );
  });

  return (
    <div class={props.language}>
      {content}
    </div>
  );
}

function Transcripts(props) {
  if (!props.transcripts) return null;

  return (
    <div class="container">
      <Paragrahs language="english" content={props.transcripts.en.paragraphs} />
      <Paragrahs language="japanese" content={props.transcripts.ja.paragraphs} />
    </div>
  );
}

function Transcripts2(props) {
  if (!props.transcripts) return null;

  const scripts = changeTranscripts(props.transcripts);

  return (
    scripts.map(script => {
      const enTime = script.en.length > 0 ?
        '[' + formatTime(script.en[0].time) + ']': '';
      const jaTime = script.ja.length > 0 ?
        '[' + formatTime(script.ja[0].time) + ']': '';
      return (
        <div class="container">
          <div class="english">
            <span class="time">{enTime}</span>
            {cuesToText(script.en)}
          </div>
          <div class="japanese">
            <span class="time">{jaTime}</span>
            {cuesToText(script.ja)}
          </div>
        </div>
      );
    })
  );
}

function formatTime(msec) {
  const rmsec = Math.floor(msec / 1000);

  const min = Math.floor(rmsec / 60);
  const sec = rmsec % 60;

  return min.toString().padStart(2, '0') + ':'
    + sec.toString().padStart(2, '0');
}

export default App;
