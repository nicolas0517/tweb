(this.webpackJsonp=this.webpackJsonp||[]).push([[20],{105:function(t,n,r){"use strict";r.r(n);var e=r(66),o=r(36);Object.defineProperty(Uint8Array.prototype,"hex",{get:function(){return Object(e.e)([...this])},set:function(t){this.set(Object(e.c)(t))},enumerable:!0,configurable:!0}),Uint8Array.prototype.randomize=function(){for(let t=0;t<this.length;++t)this[t]=Object(o.a)(255);return this},Uint8Array.prototype.concat=function(...t){return Object(e.a)(this,...t)},Uint8Array.prototype.toJSON=function(){return[...this]},Array.prototype.findAndSplice=function(t){let n=this.findIndex(t);return-1!==n?this.splice(n,1)[0]:void 0},String.prototype.toHHMMSS=function(t=!1){const n=parseInt(this+"",10),r=Math.floor(n/3600);let e=Math.floor((n-3600*r)/60),o=n-3600*r-60*e;return r&&(t=!0),e<10&&(e=t?"0"+e:e),o<10&&(o="0"+o),(r?r+":":"")+e+":"+o},Promise.prototype.finally=Promise.prototype.finally||function(t){const n=n=>Promise.resolve(t()).then(n);return this.then(t=>n(()=>t),t=>n(()=>Promise.reject(t)))}},36:function(t,n,r){"use strict";function e(t){return Math.floor(Math.random()*t)}function o(){return""+e(4294967295)+e(16777215)}r.d(n,"a",(function(){return e})),r.d(n,"b",(function(){return o}))},66:function(t,n,r){"use strict";function e(t){t=t||[];let n=[];for(let r=0;r<t.length;++r)n.push((t[r]<16?"0":"")+(t[r]||0).toString(16));return n.join("")}function o(t){const n=t.length;let r=0,e=[];n%2&&(e.push(parseInt(t.charAt(0),16)),++r);for(let o=r;o<n;o+=2)e.push(parseInt(t.substr(o,2),16));return e}function i(t){let n,r="";for(let e=t.length,o=0,i=0;i<e;++i)n=i%3,o|=t[i]<<(16>>>n&24),2!==n&&e-i!=1||(r+=String.fromCharCode(u(o>>>18&63),u(o>>>12&63),u(o>>>6&63),u(63&o)),o=0);return r.replace(/A(?=A$|$)/g,"=")}function u(t){return t<26?t+65:t<52?t+71:t<62?t-4:62===t?43:63===t?47:65}function f(t,n){const r=t.length;if(r!==n.length)return!1;for(let e=0;e<r;++e)if(t[e]!==n[e])return!1;return!0}function c(t){return t instanceof ArrayBuffer?t:void 0!==t.buffer&&t.buffer.byteLength===t.length*t.BYTES_PER_ELEMENT?t.buffer:new Uint8Array(t).buffer}function s(...t){let n=0;t.forEach(t=>n+=t.byteLength||t.length);const r=new Uint8Array(n);let e=0;return t.forEach(t=>{r.set(t instanceof ArrayBuffer?new Uint8Array(t):t,e),e+=t.byteLength||t.length}),r}r.d(n,"e",(function(){return e})),r.d(n,"c",(function(){return o})),r.d(n,"d",(function(){return i})),r.d(n,"b",(function(){return f})),r.d(n,"f",(function(){return c})),r.d(n,"a",(function(){return s}))}}]);
//# sourceMappingURL=20.de097d8b8de55902b4d8.chunk.js.map