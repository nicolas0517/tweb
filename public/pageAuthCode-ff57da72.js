import{r as f,i as h,a as _,_ as d,m as y}from"./index-4dc57066.js";import{P as S,a as v}from"./page-ba71be4f.js";import T from"./pageSignIn-2086e81f.js";import{C as k,T as I}from"./codeInputField-64756f77.js";import{s as A,r as E,l as g}from"./wrapEmojiText-4b334cdf.js";import{I as D}from"./button-cd613a17.js";import"./putPreloader-4f534c85.js";import"./countryInputField-df0b269b.js";import"./scrollable-c3fb7843.js";import"./pageSignQR-20252a0a.js";import"./textToSvgURL-c6ebb454.js";let r=null,c=null,C=null,o,n,l,u;const b=()=>{setTimeout(()=>{l?.remove(),u?.remove()},300)},L=t=>{o.setAttribute("disabled","true");const s={phone_number:r.phone_number,phone_code_hash:r.phone_code_hash,phone_code:t};_.managers.apiManager.invokeApi("auth.signIn",s,{ignoreErrors:!0}).then(e=>{switch(e._){case"auth.authorization":_.managers.apiManager.setUser(e.user),d(()=>import("./pageIm-703b20a4.js"),["./pageIm-703b20a4.js","./index-4dc57066.js","./index-80a0e9a4.css","./page-ba71be4f.js"],import.meta.url).then(a=>{a.default.mount()}),b();break;case"auth.authorizationSignUpRequired":d(()=>import("./pageSignUp-479fe47a.js"),["./pageSignUp-479fe47a.js","./index-4dc57066.js","./index-80a0e9a4.css","./loginPage-d2f4626a.js","./page-ba71be4f.js","./wrapEmojiText-4b334cdf.js","./button-cd613a17.js","./avatar-6e32e3e2.js","./scrollable-c3fb7843.js","./putPreloader-4f534c85.js"],import.meta.url).then(a=>{a.default.mount({phone_number:r.phone_number,phone_code_hash:r.phone_code_hash})}),b();break}}).catch(async e=>{let a=!1;switch(e.type){case"SESSION_PASSWORD_NEEDED":a=!0,e.handled=!0,await(await d(()=>import("./pagePassword-870a7588.js"),["./pagePassword-870a7588.js","./index-4dc57066.js","./index-80a0e9a4.css","./putPreloader-4f534c85.js","./page-ba71be4f.js","./button-cd613a17.js","./htmlToSpan-83e934e2.js","./wrapEmojiText-4b334cdf.js","./loginPage-d2f4626a.js"],import.meta.url)).default.mount(),setTimeout(()=>{o.value=""},300);break;case"PHONE_CODE_EXPIRED":o.classList.add("error"),E(n.label,h("PHONE_CODE_EXPIRED"));break;case"PHONE_CODE_EMPTY":case"PHONE_CODE_INVALID":o.classList.add("error"),E(n.label,h("PHONE_CODE_INVALID"));break;default:n.label.innerText=e.type;break}a||n.select(),o.removeAttribute("disabled")})},O=()=>{p.pageEl.querySelector(".input-wrapper").append(n.container);const t=p.pageEl.querySelector(".phone-edit");t.append(D("edit")),v(t,()=>T.mount())},P=()=>{const t=p.pageEl.querySelector(".auth-image"),s=y.isMobile?100:166;if(r.type._==="auth.sentCodeTypeFragmentSms"){t.firstElementChild&&(l?.remove(),l=void 0,t.replaceChildren());const e=document.createElement("div");return e.classList.add("media-sticker-wrapper"),t.append(e),g.loadAnimationAsAsset({container:e,loop:!0,autoplay:!0,width:s,height:s},"jolly_roger").then(a=>(u=a,g.waitForFirstFrame(a))).then(()=>{})}else return t.firstElementChild&&(u?.remove(),u=void 0,t.replaceChildren()),l=new I(n,s),t.append(l.container),l.load()},p=new S("page-authCode",!0,O,t=>{if(r=t,!c)c=p.pageEl.getElementsByClassName("phone")[0],C=p.pageEl.getElementsByClassName("sent-type")[0];else{o.value="";const i=document.createEvent("HTMLEvents");i.initEvent("input",!1,!0),o.dispatchEvent(i)}const s=r.type.length;n||(n=new k({label:"Code",name:f(),length:s,onFill:i=>{L(i)}}),o=n.input),n.options.length=s,c.innerText=r.phone_number;let e,a;const m=r.type;switch(m._){case"auth.sentCodeTypeSms":e="Login.Code.SentSms";break;case"auth.sentCodeTypeApp":e="Login.Code.SentInApp";break;case"auth.sentCodeTypeCall":e="Login.Code.SentCall";break;case"auth.sentCodeTypeFragmentSms":e="PhoneNumber.Code.Fragment.Info";const i=document.createElement("a");A(i),i.href=m.url,a=[i];break;default:e="Login.Code.SentUnknown",a=[m._];break}return E(C,h(e,a)),_.managers.appStateManager.pushToState("authState",{_:"authStateAuthCode",sentCode:t}),P().catch(()=>{})},()=>{o.focus()});export{p as default};
//# sourceMappingURL=pageAuthCode-ff57da72.js.map