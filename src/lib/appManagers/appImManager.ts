import { MTProto } from "../mtproto/mtproto";
import { $rootScope, isElementInViewport, numberWithCommas } from "../utils";
import appUsersManager from "./appUsersManager";
import appMessagesManager from "./appMessagesManager";
import appPeersManager from "./appPeersManager";
import appProfileManager from "./appProfileManager";
import { ProgressivePreloader, wrapDocument, wrapSticker, wrapVideo, wrapPhoto } from "../../components/misc";
import appDialogsManager from "./appDialogsManager";
import { RichTextProcessor } from "../richtextprocessor";
import appPhotosManager from "./appPhotosManager";
import appSidebarRight from './appSidebarRight';

import { logger } from "../polyfill";
import lottieLoader from "../lottieLoader";
import appMediaViewer from "./appMediaViewer";
import appSidebarLeft from "./appSidebarLeft";
import appChatsManager from "./appChatsManager";

console.log('appImManager included!');

let testScroll = false;

class ScrollPosition {
  public previousScrollHeightMinusTop = 0;
  public readyFor = 'up';
  public container: HTMLElement;

  constructor(public node: HTMLElement) {
    this.container = node.parentElement;
  }

  /* public restore() {
    if(!this.scroll) return;
    //console.log('restore', this.readyFor, this.previousScrollHeightMinusTop);

    //if(this.readyFor === 'up') {
      this.scroll.update(true);

      //console.log('restore 2', this.node.scrollHeight, (this.node.scrollHeight
        //- this.previousScrollHeightMinusTop) + 'px')

      this.scroll.scroll({y: (this.node.scrollHeight
        - this.previousScrollHeightMinusTop) + 'px'});
    //}
  
    // 'down' doesn't need to be special cased unless the
    // content was flowing upwards, which would only happen
    // if the container is position: absolute, bottom: 0 for
    // a Facebook messages effect
  }

  public prepareFor(direction: string) {
    if(!this.scroll) return;

    this.readyFor = direction || 'up';

    this.scroll.update(true);
    let pos = this.scroll.scroll();
    this.previousScrollHeightMinusTop = this.node.scrollHeight
      - pos.position.y;
  } */

  public restore() {
    //console.log('scrollPosition restore 2', this.node.scrollHeight, (this.node.scrollHeight
      //- this.previousScrollHeightMinusTop) + 'px', this.container);

    //if(this.readyFor === 'up') {
      this.container.scrollTop = this.node.scrollHeight
        - this.previousScrollHeightMinusTop;
    //}
  
    // 'down' doesn't need to be special cased unless the
    // content was flowing upwards, which would only happen
    // if the container is position: absolute, bottom: 0 for
    // a Facebook messages effect
  }

  public prepareFor(direction: string) {
    this.readyFor = direction || 'up';
    this.previousScrollHeightMinusTop = this.node.scrollHeight
      - this.container.scrollTop;

    //console.log('scrollPosition prepareFor', direction, this.node.scrollHeight, this.previousScrollHeightMinusTop + 'px')
  }
}

export class AppImManager {
  public pageEl = document.querySelector('.page-chats') as HTMLDivElement;
  public btnMute = this.pageEl.querySelector('.tool-mute') as HTMLButtonElement;
  public avatarEl = document.getElementById('im-avatar') as HTMLDivElement;
  public titleEl = document.getElementById('im-title') as HTMLDivElement;
  public subtitleEl = document.getElementById('im-subtitle') as HTMLDivElement;
  public chatInner = document.getElementById('bubbles-inner') as HTMLDivElement;
  public searchBtn = this.pageEl.querySelector('.chat-search-button') as HTMLButtonElement;
  public firstContainerDiv: HTMLDivElement;
  public lastContainerDiv: HTMLDivElement;
  private getHistoryPromise: Promise<boolean>;
  private getHistoryTimeout = 0;

  public myID = 0;
  public peerID = 0;

  public lastDialog: any;
  public bubbles: {[mid: number]: HTMLDivElement} = {};
  public dateMessages: {[timestamp: number]: { div: HTMLDivElement, firstTimestamp: number }} = {};
  public unreaded: number[] = [];
  public unreadOut: number[] = [];
  
  public offline = false;
  public updateStatusInterval = 0;

  public pinnedMsgID = 0;
  private pinnedMessageContainer = this.pageEl.querySelector('.pinned-message') as HTMLDivElement;
  private pinnedMessageContent = this.pinnedMessageContainer.querySelector('.pinned-message-subtitle') as HTMLDivElement;
  
  private firstTopMsgID = 0;

  public loadMediaQueue: Array<() => Promise<void>> = [];
  private loadMediaQueuePromise: Promise<void[]> = null;
  
  public scroll: HTMLDivElement = null;
  public scrollPosition: ScrollPosition = null;

  public log: ReturnType<typeof logger>;

  private preloader: ProgressivePreloader = null;

  private typingTimeouts: {[peerID: number]: number} = {};
  private typingUsers: {[userID: number]: number} = {} // to peerID

  constructor() {
    this.log = logger('IM');

    this.preloader = new ProgressivePreloader(null, false);

    MTProto.apiManager.getUserID().then((id) => {
      this.myID = id;
    });

    $rootScope.$on('user_auth', (e: CustomEvent) => {
      let userAuth = e.detail;
      this.myID = userAuth ? userAuth.id : 0;
    });

    $rootScope.$on('history_append', (e: CustomEvent) => {
      let details = e.detail;

      this.renderMessagesByIDs([details.messageID]);
    });

    $rootScope.$on('history_multiappend', (e: CustomEvent) => {
      let msgIDsByPeer = e.detail;
      if(!(this.peerID in msgIDsByPeer)) return;

      let msgIDs = msgIDsByPeer[this.peerID];

      this.renderMessagesByIDs(msgIDs);
    });

    $rootScope.$on('message_sent', (e: CustomEvent) => {
      let {tempID, mid} = e.detail;

      let bubble = this.bubbles[tempID];
      if(bubble) {
        this.bubbles[mid] = bubble;
        delete this.bubbles[tempID];
      }

      let length = this.unreadOut.length;
      for(let i = 0; i < length; i++) {
        if(this.unreadOut[i] == tempID) {
          this.unreadOut[i] = mid;
        }
      }
    });

    $rootScope.$on('messages_downloaded', (e: CustomEvent) => {
      let mid = e.detail;
      
      if(this.pinnedMsgID == mid) {
        let message = appMessagesManager.getMessage(mid);
        this.log('setting pinned message', message);
        this.pinnedMessageContainer.setAttribute('data-mid', mid);
        this.pinnedMessageContainer.style.display = '';
        this.pinnedMessageContent.innerHTML = RichTextProcessor.wrapPlainText(message.message);
      }
    });

    $rootScope.$on('apiUpdate', (e: CustomEvent) => {
      let update = e.detail;

      switch(update._) {
        case 'updateUserTyping':
        case 'updateChatUserTyping':
          if(this.myID == update.user_id) {
            return;
          }

          var peerID = update._ == 'updateUserTyping' ? update.user_id : -update.chat_id;
          this.typingUsers[update.user_id] = peerID;

          if(!appUsersManager.hasUser(update.user_id)) {
            if(update.chat_id &&
              appChatsManager.hasChat(update.chat_id) &&
              !appChatsManager.isChannel(update.chat_id)) {
              appProfileManager.getChatFull(update.chat_id);
            }

            //return;
          }

          appUsersManager.forceUserOnline(update.user_id);

          let dialog = appMessagesManager.getDialogByPeerID(peerID)[0];
          let currentPeer = this.peerID == peerID;

          if(this.typingTimeouts[peerID]) clearTimeout(this.typingTimeouts[peerID]);
          else if(dialog) {
            appDialogsManager.setTyping(dialog, appUsersManager.getUser(update.user_id));

            if(currentPeer) { // user
              this.setPeerStatus();
            }
          }

          this.typingTimeouts[peerID] = setTimeout(() => {
            this.typingTimeouts[peerID] = 0;
            delete this.typingUsers[update.user_id];

            if(dialog) {
              appDialogsManager.unsetTyping(dialog);
            }

            // лень просчитывать случаи
            this.setPeerStatus();
          }, 6000);
          break;
      }
    })

    window.addEventListener('blur', () => {
      lottieLoader.checkAnimations(true);

      this.offline = true;
      this.updateStatus();
      clearInterval(this.updateStatusInterval);
      
      window.addEventListener('focus', () => {
        lottieLoader.checkAnimations(false);

        this.offline = false;
        this.updateStatus();
        this.updateStatusInterval = window.setInterval(() => this.updateStatus(), 50e3);
      }, {once: true});
    });

    (this.pageEl.querySelector('.person') as HTMLDivElement).addEventListener('click', (e) => {
      appSidebarRight.toggleSidebar(true);
    });

    this.chatInner.addEventListener('click', (e) => {
      let target = e.target as HTMLElement;
      if(target.tagName == 'IMG' || target.tagName == 'VIDEO') {
        let messageID = +target.getAttribute('message-id');
        let message = appMessagesManager.getMessage(messageID);

        if(!message) {
          this.log.warn('no message by messageID:', messageID);
          return;
        }

        appMediaViewer.openMedia(message, true);
      }

      //console.log('chatInner click', e);
    });

    this.searchBtn.addEventListener('click', (e) => {
      if(this.peerID) {
        appSidebarLeft.beginSearch(this.peerID);
      }
    });

    this.pinnedMessageContainer.addEventListener('click', (e) => {
      e.preventDefault();
      e.cancelBubble = true;

      let mid = +this.pinnedMessageContainer.getAttribute('data-mid');
      this.setPeer(this.peerID, mid);
    });

    this.updateStatusInterval = window.setInterval(() => this.updateStatus(), 50e3);
    this.updateStatus();
    setInterval(() => this.setPeerStatus(), 60e3);
    
    this.loadMediaQueueProcess();
  }

  public loadMediaQueuePush(cb: () => Promise<void>) {
    this.loadMediaQueue.push(cb);
    this.loadMediaQueueProcess();
  }

  public async loadMediaQueueProcess(): Promise<void[]> {
    if(this.loadMediaQueuePromise /* || 1 == 1 */) return this.loadMediaQueuePromise;

    let woo = this.loadMediaQueue.splice(-5, 5).reverse().map(f => f());

    if(woo.length) {
      this.log('Will load more media:', woo.length);

      try {
        this.loadMediaQueuePromise = Promise.all(woo);
        await this.loadMediaQueuePromise;
      } catch(err) {
        this.log.error('loadMediaQueue error:', err);
      }
    }

    this.loadMediaQueuePromise = null;
    
    if(this.loadMediaQueue.length) return this.loadMediaQueueProcess();
    return this.loadMediaQueuePromise;
  }

  public updateStatus() {
    if(!this.myID) return Promise.resolve();

    appUsersManager.setUserStatus(this.myID, this.offline);
    return MTProto.apiManager.invokeApi('account.updateStatus', {
      offline: this.offline
    }, {noErrorBox: true});
  }

  public onScroll() {
    let length = this.unreaded.length;
    let readed: number[] = [];

    for(let i = length - 1; i >= 0; --i) {
      let msgID = this.unreaded[i];
      let bubble = this.bubbles[msgID];

      if(isElementInViewport(bubble)) {
        readed.push(msgID);
        this.unreaded.splice(i, 1);
      }
    }

    lottieLoader.checkAnimations();

    if(readed.length) {
      let max = Math.max(...readed);
      let min = Math.min(...readed);

      //appMessagesManager.readMessages(readed);
      appMessagesManager.readHistory(this.peerID, max, min);
    }

    if(this.scroll.scrollHeight - (this.scroll.scrollTop + this.scroll.offsetHeight) == 0/* <= 5 */) {
      this.scroll.parentElement.classList.add('scrolled-down');
    } else if(this.scroll.parentElement.classList.contains('scrolled-down')) {
      this.scroll.parentElement.classList.remove('scrolled-down');
    }

    // load more history
    if(!this.getHistoryPromise && !this.getHistoryTimeout /* && false */) {
      let history = Object.keys(this.bubbles).map(id => +id).sort();
      /* let history = appMessagesManager.historiesStorage[this.peerID].history;
      let length = history.length; */
      this.getHistoryTimeout = setTimeout(() => { // must be
        this.getHistoryTimeout = 0;

        let willLoad = false;
        for(let i = 0; i < 10; ++i) {
          let msgID = history[i];
          if(!(msgID in this.bubbles) || msgID <= 0) continue;
  
          let bubble = this.bubbles[msgID];
  
          if(isElementInViewport(bubble)) {
            willLoad = true;

            this.log('Will load more (up) history by id:', history[0], 'maxID:', history[history.length - 1], history, bubble);
            /* false &&  */!testScroll && this.getHistory(history[0], true).then(() => { // uncomment
              this.onScroll();
            }).catch(err => {
              this.log.warn('Could not load more history, err:', err);
            });
  
            break;
          }
        }

        let dialog = appMessagesManager.getDialogByPeerID(this.peerID)[0];

        // if scroll down after search
        if(!willLoad && history.indexOf(/* this.lastDialog */dialog.top_message) === -1) {
          let lastMsgIDs = history.slice(-10);
          for(let msgID of lastMsgIDs) {
            if(!(msgID in this.bubbles) || msgID <= 0) continue;
    
            let bubble = this.bubbles[msgID];
    
            if(isElementInViewport(bubble)) {
              willLoad = true;
  
              this.log('Will load more (down) history by maxID:', lastMsgIDs[lastMsgIDs.length - 1], lastMsgIDs, bubble);
              /* false &&  */!testScroll && this.getHistory(lastMsgIDs[lastMsgIDs.length - 1], false, true).then(() => { // uncomment
                this.onScroll();
              }).catch(err => {
                this.log.warn('Could not load more history, err:', err);
              });
    
              break;
            }
          }
        }
      }, 0);
    }
  }

  public setScroll(scroll: HTMLDivElement) {
    this.scroll = scroll;
    this.scrollPosition = new ScrollPosition(this.chatInner);
    this.scroll.onscroll = this.onScroll.bind(this);
  }

  public setPeerStatus() {
    if(!this.myID) return;

    // set subtitle
    this.subtitleEl.innerText = appSidebarRight.profileElements.subtitle.innerText = '';
    this.subtitleEl.classList.remove('online');
    appSidebarRight.profileElements.subtitle.classList.remove('online');

    if(this.peerID < 0) { // not human
      let chat = appPeersManager.getPeer(this.peerID);
      let isChannel = appPeersManager.isChannel(this.peerID) && !appPeersManager.isMegagroup(this.peerID);

      this.log('setPeerStatus', chat);
      // will redirect if wrong
      appProfileManager.getChatFull(chat.id).then((res: any) => {
        this.log('chatInfo res:', res);

        if(res.pinned_msg_id) { // request pinned message
          this.pinnedMsgID = res.pinned_msg_id;
          appMessagesManager.wrapSingleMessage(res.pinned_msg_id);
        }

        let participants_count = res.participants_count || res.participants.participants.length;
        let subtitle = numberWithCommas(participants_count) + ' ' + (isChannel ? 'subscribers' : 'members');

        this.subtitleEl.innerText = appSidebarRight.profileElements.subtitle.innerText = subtitle;
      });
    } else if(!appUsersManager.isBot(this.peerID)) { // user
      let user = appUsersManager.getUser(this.peerID);

      //this.subtitleEl.classList.remove('online');

      if(user && user.status && this.myID != this.peerID) {
        let subtitle = '';
        switch(user.status._) {
          case 'userStatusRecently':
            subtitle += 'last seen recently';
            break;
          case 'userStatusOffline':
            subtitle = 'last seen ';
            
            let date = user.status.was_online;
            let now = Date.now() / 1000;
  
            if((now - date) < 60) {
              subtitle += ' just now';
            } else if((now - date) < 3600) {
              subtitle += ((now - date) / 60 | 0) + ' minutes ago';
            } else if(now - date < 86400) {
              subtitle += ((now - date) / 3600 | 0) + ' hours ago';
            } else {
              let d = new Date(date * 1000);
              subtitle += ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + ' at ' + 
                ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
            }
  
            break;
          
          case 'userStatusOnline':
            this.subtitleEl.classList.add('online');
            appSidebarRight.profileElements.subtitle.classList.add('online');
            subtitle = 'online';
            break;
        }

        appSidebarRight.profileElements.subtitle.innerText = subtitle;

        if(this.typingUsers[this.peerID] == this.peerID) {
          this.subtitleEl.innerText = 'typing...';
          this.subtitleEl.classList.add('online');
        } else this.subtitleEl.innerText = subtitle;
      }
    }
  }

  
  
  public cleanup() {
    this.peerID = $rootScope.selectedPeerID = 0;

    if(this.lastContainerDiv) this.lastContainerDiv.remove();
    if(this.firstContainerDiv) this.firstContainerDiv.remove();
    this.lastContainerDiv = undefined;
    this.firstContainerDiv = undefined;

    for(let i in this.bubbles) {
      let bubble = this.bubbles[i];
      bubble.remove();
    }
    this.bubbles = {};
    this.dateMessages = {};
    this.unreaded = [];
    this.unreadOut = [];
    this.loadMediaQueue = [];

    console.time('chatInner clear');

    this.chatInner.innerHTML = '';
    /* Array.from(this.chatInner.children).forEach(c => {
      this.chatInner.removeChild(c);
    }); */

    console.timeEnd('chatInner clear');

    //appSidebarRight.minMediaID = {};
  }

  public setPeer(peerID: number, lastMsgID = 0) {
    let samePeer = this.peerID == peerID;

    if(samePeer && !testScroll && !lastMsgID) {
      return Promise.resolve(true); // uncomment
    }

    if(samePeer && lastMsgID == this.lastDialog.top_message) {
      if(this.bubbles[lastMsgID]) {
        this.scroll.scrollTop = this.scroll.scrollHeight;
        return Promise.resolve(true);
      }
    }

    // clear 
    this.cleanup();

    // set new
    this.peerID = $rootScope.selectedPeerID = peerID;

    // no dialog
    if(!appMessagesManager.getDialogByPeerID(this.peerID).length) {
      this.log.error('No dialog by peerID:', this.peerID);
      return Promise.reject();
    }

    this.pinnedMessageContainer.style.display = 'none';

    this.preloader.attach(this.chatInner);

    if(this.lastDialog) {
      let lastDom = appDialogsManager.getDialogDom(this.lastDialog.peerID);
      lastDom.listEl.classList.remove('active');
    }

    let dialog = this.lastDialog = appMessagesManager.getDialogByPeerID(this.peerID)[0];
    this.log('setPeer peerID:', this.peerID, dialog);
    appDialogsManager.loadDialogPhoto(this.avatarEl, dialog.peerID);
    appDialogsManager.loadDialogPhoto(appSidebarRight.profileElements.avatar, dialog.peerID);

    this.firstTopMsgID = dialog.top_message || 0;

    let dom = appDialogsManager.getDialogDom(this.peerID);
    if(!dom) {
      this.log.warn('No rendered dialog by peerID:', this.peerID);
      appDialogsManager.addDialog(dialog);
      dom = appDialogsManager.getDialogDom(this.peerID);
    }
    // warning need check
    dom.listEl.classList.add('active');

    this.setPeerStatus();

    this.titleEl.innerText = appSidebarRight.profileElements.name.innerText = dom.titleSpan.innerText;

    appSidebarRight.toggleSidebar(true);

    return Promise.all([
      this.getHistory(lastMsgID).then(() => {
        this.log('setPeer removing preloader');

        if(lastMsgID) {
          this.renderMessage(appMessagesManager.getMessage(lastMsgID));

          if(lastMsgID != dialog.top_message) {
            this.bubbles[lastMsgID].scrollIntoView();
          }
        } else if(dialog.top_message) { // add last message, bc in getHistory will load < max_id
          this.renderMessage(appMessagesManager.getMessage(dialog.top_message));
        }
        
        if(this.scroll) {
          this.onScroll();
        }
        
        this.preloader.detach();

        setTimeout(() => {
          //appSidebarRight.fillProfileElements();
          appSidebarRight.loadSidebarMedia();
        }, 0);
        
        return true;
      })/* .catch(err => {
        this.log.error(err);
      }) */,

      appSidebarRight.fillProfileElements()
    ]).catch(err => {
      this.log.error(err);
    });
  }

  public updateUnreadByDialog(dialog: any) {
    let maxID = dialog.read_outbox_max_id;

    let length = this.unreadOut.length;
    for(let i = length - 1; i >= 0; --i) {
      let msgID = this.unreadOut[i];
      if(msgID <= maxID) {
        let bubble = this.bubbles[msgID];
        bubble.classList.remove('sent');
        bubble.classList.add('read');
        this.unreadOut.splice(i, 1);
      }
    }
  }

  public deleteMessagesByIDs(msgIDs: number[]) {
    msgIDs.forEach(id => {
      if(!(id in this.bubbles)) return;
      
      let bubble = this.bubbles[id];
      let parent = bubble.parentNode as HTMLDivElement;
      delete this.bubbles[id];
      bubble.remove();
      
      if(!parent.childNodes.length) {
        parent.remove();
      }
    });

    lottieLoader.checkAnimations();
  }

  public renderMessagesByIDs(msgIDs: number[]) {
    if(!this.bubbles[this.firstTopMsgID]) { // seems search active
      return;
    }

    msgIDs.forEach((msgID: number) => {
      let message = appMessagesManager.getMessage(msgID);

      this.log('got new message to append:', message);

      //this.unreaded.push(msgID);
      this.renderMessage(message);
    });
  }

  public renderMessage(message: any, reverse = false, multipleRender?: boolean) {
    let peerID = this.peerID;
    let our = message.fromID == this.myID;
  
    let messageDiv = document.createElement('div');
    messageDiv.classList.add('message');

    this.log('message to render:', message);

    //messageDiv.innerText = message.message;
  
    // time section
  
    let date = new Date(message.date * 1000);
    let time = ('0' + date.getHours()).slice(-2) + 
      ':' + ('0' + date.getMinutes()).slice(-2);
  
    let timeSpan = document.createElement('span');
    timeSpan.classList.add('time');
  
    let timeInner = document.createElement('div');
    timeInner.classList.add('inner', 'tgico');
    timeInner.innerText = time;
  
    // bubble
    let bubble = document.createElement('div');
    bubble.classList.add('bubble');

    this.bubbles[+message.mid] = bubble;
  
    let richText = RichTextProcessor.wrapRichText(message.message, {
      entities: message.totalEntities
    });

    if(message.totalEntities) {
      let emojiEntities = message.totalEntities.filter((e: any) => e._ == 'messageEntityEmoji');
      let strLength = message.message.length;
      let emojiStrLength = emojiEntities.reduce((acc: number, curr: any) => acc + curr.length, 0);
  
      if(emojiStrLength == strLength && emojiEntities.length <= 3) {
        let attachmentDiv = document.createElement('div');
        attachmentDiv.classList.add('attachment');

        attachmentDiv.innerHTML = richText;

        messageDiv.classList.add('message-empty');
        bubble.classList.add('emoji-' + emojiEntities.length + 'x', 'emoji-big');

        bubble.append(attachmentDiv);
      } else {
        messageDiv.innerHTML = richText;
      }

      /* if(strLength == emojiStrLength) {
        messageDiv.classList.add('emoji-only');
        messageDiv.classList.add('message-empty');
      } */
    } else {
      messageDiv.innerHTML = richText;
    }

    //messageDiv.innerHTML = 'samsung samsung samsung';

    timeSpan.appendChild(timeInner);
    messageDiv.append(timeSpan);
    bubble.prepend(messageDiv);
  
    if(our) {
      if(message.pFlags.unread) this.unreadOut.push(message.mid);
      let status = message.pFlags.unread ? 'sent' : 'read';
      bubble.classList.add(status);
    } else {
      //this.log('not our message', message, message.pFlags.unread);
      if(message.pFlags.unread) this.unreaded.push(message.mid);
    }

    // media
    if(message.media) {
      let attachmentDiv = document.createElement('div');
      attachmentDiv.classList.add('attachment');

      if(!message.message) {
        messageDiv.classList.add('message-empty');
      }

      let processingWebPage = false;
      switch(message.media._) {
        case 'messageMediaPhoto': {
          let photo = message.media.photo;
          this.log('messageMediaPhoto', photo);

          bubble.classList.add('hide-name', 'photo');

          wrapPhoto.call(this, photo, message, attachmentDiv);
          break;
        }

        case 'messageMediaWebPage': {
          processingWebPage = true;

          let webpage = message.media.webpage;
          this.log('messageMediaWebPage', webpage);
          if(webpage._ == 'webPageEmpty') {
            break;
          } 

          bubble.classList.add('webpage');

          let box = document.createElement('div');
          box.classList.add('box', 'web');

          let quote = document.createElement('div');
          quote.classList.add('quote');

          let nameEl = document.createElement('a');
          nameEl.classList.add('name');

          let titleDiv = document.createElement('div');
          titleDiv.classList.add('title');

          let textDiv = document.createElement('div');
          textDiv.classList.add('text');

          let loadedVideo = false;

          let preview: HTMLDivElement = null;
          if(webpage.photo || webpage.document) {
            preview = document.createElement('div');
            preview.classList.add('preview');
          }

          let doc: any = null;
          if(webpage.document) {
            doc = webpage.document;

            if(doc.type == 'gif' || doc.type == 'video') {
              bubble.classList.add('video');
              wrapVideo.call(this, doc, preview, message);
            } else {
              doc = null;
            }
          }

          if(webpage.photo && !doc) {
            bubble.classList.add('photo');
            appPhotosManager.savePhoto(webpage.photo); // hot-fix because no webpage manager

            wrapPhoto.call(this, webpage.photo, message, preview);
          }

          if(preview) {
            quote.append(preview);
          }

          nameEl.setAttribute('target', '_blank');
          nameEl.href = webpage.url || '#';
          nameEl.innerText = webpage.site_name || '';

          if(webpage.description) {
            textDiv.innerHTML = RichTextProcessor.wrapRichText(webpage.description);
          }

          //textDiv.innerText = webpage.description || '';

          quote.append(nameEl, titleDiv, textDiv);
          box.append(quote);

          bubble.prepend(box);

          //this.log('night running', bubble.scrollHeight);

          break;
        }

        case 'messageMediaDocument': {
          let doc = message.media.document;
          /* if(document.size > 1e6) { // 1mb
            break;
          } */

          this.log('messageMediaDocument', doc);

          if(doc.sticker && doc.size <= 1e6) {
            bubble.classList.add('sticker');

            if(doc.animated) {
              bubble.classList.add('sticker-animated');
            }

            appPhotosManager.setAttachmentSize(doc, attachmentDiv);
            bubble.style.height = attachmentDiv.style.height;
            bubble.style.width = attachmentDiv.style.width;
            //appPhotosManager.setAttachmentSize(doc, bubble);
            let load = () => wrapSticker(doc, attachmentDiv, () => {
              if(this.peerID != peerID) {
                this.log.warn('peer changed, canceling sticker attach');
                return false;
              }

              return true;
            })/* .then(() => {
              attachmentDiv.style.width = '';
              attachmentDiv.style.height = '';
            }) */;

            this.loadMediaQueuePush(load);

            break;
          } else if(doc.mime_type == 'video/mp4') {
            this.log('never get free 2', doc);

            bubble.classList.add('video');
            wrapVideo.call(this, doc, attachmentDiv, message);

            break;
          } else {
            let docDiv = wrapDocument(doc);

            messageDiv.classList.remove('message-empty');
            messageDiv.append(docDiv);
            processingWebPage = true;

            break;
          }
        }
          
        default:
          messageDiv.classList.remove('message-empty');
          messageDiv.innerHTML = 'unrecognized media type: ' + message.media._;
          messageDiv.append(timeSpan);
          this.log.warn('unrecognized media type:', message.media._, message);
          break;
      }

      if(!processingWebPage) {
        bubble.append(attachmentDiv);
      }
    }

    if(message.fwd_from) {
      let fwd = message.fwd_from;
      //let peerFrom = appPeersManager.getPeerTitle()
      /* let fromTitle =  */appPeersManager.getPeerTitle(fwd.from_id);
    }

    if((this.peerID < 0 && !our) || message.fwd_from) { // chat
      let title = appPeersManager.getPeerTitle(message.fwdFromID || message.fromID);
      //this.log(title);

      if(message.fwdFromID) {
        bubble.classList.add('forwarded');

        if(!bubble.classList.contains('sticker')) {
          let nameDiv = document.createElement('div');
          nameDiv.classList.add('name');
          nameDiv.innerText = 'Forwarded from ' + title;
          bubble.append(nameDiv);
        }
      } else {
        if(message.reply_to_mid) {
          let box = document.createElement('div');
          box.classList.add('box');

          let quote = document.createElement('div');
          quote.classList.add('quote');

          let nameEl = document.createElement('a');
          nameEl.classList.add('name');

          let textDiv = document.createElement('div');
          textDiv.classList.add('text');

          let originalMessage = appMessagesManager.getMessage(message.reply_to_mid);
          let originalPeerTitle = appPeersManager.getPeerTitle(originalMessage.fromID) || '';

          nameEl.innerText = originalPeerTitle;
          textDiv.innerHTML = RichTextProcessor.wrapRichText(originalMessage.message, {
            entities: originalMessage.totalEntities
          });

          quote.append(nameEl, textDiv);
          box.append(quote);

          bubble.append(box);
        }

        /* if(message.media) {
          switch(message.media._) {
            case 'messageMediaWebPage': {
              let nameDiv = document.createElement('div');
              nameDiv.classList.add('name');
              nameDiv.innerText = title;
              bubble.append(nameDiv);
              break;
            }
          }
        } */

        if(!bubble.classList.contains('sticker')) {
          let nameDiv = document.createElement('div');
          nameDiv.classList.add('name');
          nameDiv.innerText = title;
          bubble.append(nameDiv);
        }
  
        //bubble.prepend(avatarDiv);
        /* if(messageDiv.nextElementSibling) {
          bubble.insertBefore(avatarDiv, messageDiv.nextElementSibling);
        } else { */
          
        //}
      }

      if(!our && this.peerID < 0) {
        let avatarDiv = document.createElement('div');
        avatarDiv.classList.add('user-avatar');
    
        this.log('exec loadDialogPhoto', message);
        if(message.fromID) { // if no - user hidden
          appDialogsManager.loadDialogPhoto(avatarDiv, message.fromID);
        } else if(!title && message.fwd_from && message.fwd_from.from_name) {
          title = message.fwd_from.from_name;
  
          appDialogsManager.loadDialogPhoto(avatarDiv, title);
        }
  
        bubble.append(avatarDiv);
      }
    }
  
    let type = our ? 'out' : 'in';

    let containerDiv = reverse ? this.firstContainerDiv : this.lastContainerDiv;
    if(!containerDiv || !containerDiv.classList.contains(type)) {
      /* if(containerDiv) {
        if(reverse) this.chatInner.prepend(containerDiv);
        else this.chatInner.append(containerDiv);
      } */
  
      containerDiv = document.createElement('div');
      containerDiv.classList.add(type);

      if(!this.firstContainerDiv) this.firstContainerDiv = containerDiv;

      if(reverse) this.firstContainerDiv = containerDiv;
      else this.lastContainerDiv = containerDiv;
    }

    if(reverse) {
      if(!multipleRender) {
        this.scrollPosition.prepareFor('up'); // лагает из-за этого
      }

      containerDiv.prepend(bubble);
      this.chatInner.prepend(containerDiv);
    } else {
      if(!multipleRender) {
        this.scrollPosition.prepareFor('down'); // лагает из-за этого
      }

      containerDiv.append(bubble);
      this.chatInner.append(containerDiv);
    }

    if(bubble.classList.contains('webpage')) {
      this.log('night running', bubble, bubble.scrollHeight);
    }

    //return //this.scrollPosition.restore();

    let justDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let dateTimestamp = justDate.getTime();
    if(!(dateTimestamp in this.dateMessages)) {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'];
      let str = justDate.getFullYear() == new Date().getFullYear() ? 
        months[justDate.getMonth()] + ' ' + justDate.getDate() : 
        justDate.toISOString().split('T')[0].split('-').reverse().join('.');

      let div = document.createElement('div');
      div.classList.add('service');
      div.innerHTML = `<div class="service-msg">${str}</div>`;
      this.log('need to render date message', dateTimestamp, str);
      
      this.dateMessages[dateTimestamp] = {
        div, 
        firstTimestamp: date.getTime()
      };

      //this.chatInner.insertBefore(div, containerDiv);
      containerDiv.insertBefore(div, bubble);
    } else {
      let dateMessage = this.dateMessages[dateTimestamp];
      if(dateMessage.firstTimestamp > date.getTime()) {
        //this.chatInner.insertBefore(dateMessage.div, containerDiv);
        containerDiv.insertBefore(dateMessage.div, bubble);
      }
    }

    if(!multipleRender) {
      this.scrollPosition.restore();  // лагает из-за этого
    }

    //this.log('history msg', message);
  }

  // reverse means scroll up
  public getHistory(maxID = 0, reverse = false, isBackLimit = false) {
    let peerID = this.peerID;

    if(!maxID && this.lastDialog.top_message) {
      maxID = this.lastDialog.top_message/*  + 1 */;
    }

    let loadCount = Object.keys(this.bubbles).length > 0 ? 
      20 : 
      (this.chatInner.parentElement.parentElement.scrollHeight) / 30 * 1.25 | 0;

    console.time('render getHistory');
    console.time('render history total');

    let backLimit = 0;
    if(isBackLimit) {
      backLimit = loadCount;
      loadCount = 0;
      maxID += 1;
    }

    return this.getHistoryPromise = appMessagesManager.getHistory(this.peerID, maxID, loadCount, backLimit)
    .then((result: any) => {
      this.log('getHistory result by maxID:', maxID, reverse, isBackLimit, result);

      console.timeEnd('render getHistory');

      if(this.peerID != peerID) {
        this.log.warn('peer changed');
        console.timeEnd('render history total');
        return Promise.reject();
      }

      if(!result || !result.history) {
        console.timeEnd('render history total');
        return true;
      } 
  
      //this.chatInner.innerHTML = '';

      let history = result.history.slice();
      
      if(reverse) history.reverse();

      console.time('render history');

      if(!isBackLimit) {
        this.scrollPosition.prepareFor(reverse ? 'up' : 'down');
      }
      
      let length = history.length;
      for(let i = length - 1; i >= 0; --i) {
        let msgID = history[i];
  
        let message = appMessagesManager.getMessage(msgID);
  
        this.renderMessage(message, reverse, true);
      }

      if(!isBackLimit) {
        this.scrollPosition.restore();
      }

      console.timeEnd('render history');

      this.getHistoryPromise = undefined;

      console.timeEnd('render history total');

      return true;
    });
  }
}

export default new AppImManager();
