(function () {
  var serverURL = window.__YUNXIU_WALINE_SERVER__ || "";
      var el = document.getElementById('waline');
      var empty = document.getElementById('comment-empty');
      if (!el) return;

      var inst = null;
      var tries = 30;
      var authToken = '';
      var authUser = null;
      var customPublic = [];
      var customMine = [];
      var currentEmojiImage = '';
      var captchaToken = '';
      var captchaAnswer = '';

      function setStatus(target, message) {
        if (target) target.textContent = message || '';
      }

      function authHeaders(extra) {
        var headers = extra || {};
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
        return headers;
      }

      function getPostHeaders() {
        return authHeaders({ 'Content-Type': 'application/json' });
      }

      function updateLoginState() {
        var btn = document.getElementById('comment-login-toggle');
        var state = document.getElementById('comment-user-state');
        if (btn) btn.textContent = authUser ? '退出登录' : '登录 / 注册';
        if (state) state.textContent = authUser ? '已登录 · ' + authUser.nick : '未登录';
        prefillMeta();
      }

      function prefillMeta() {
        if (!authUser) return;
        var inputs = document.querySelectorAll('#waline .wl-header input');
        if (inputs[0]) {
          inputs[0].value = authUser.nick;
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        }
        // 不自动回填邮箱，避免让访客误以为邮箱会公开显示
      }

      function saveSession(data) {
        authToken = String(data.token || '');
        authUser = data.user || null;
        try {
          if (authToken) localStorage.setItem('yxs_comment_token_v1', authToken);
          else localStorage.removeItem('yxs_comment_token_v1');
          if (authUser) localStorage.setItem('yxs_comment_user_v1', JSON.stringify(authUser));
          else localStorage.removeItem('yxs_comment_user_v1');
        } catch (e) {}
        updateLoginState();
      }

      function clearSession() {
        authToken = '';
        authUser = null;
        customMine = [];
        try {
          localStorage.removeItem('yxs_comment_token_v1');
          localStorage.removeItem('yxs_comment_user_v1');
        } catch (e) {}
        updateLoginState();
        renderCustomEmojis();
      }

      function loadAccount() {
        try {
          authToken = localStorage.getItem('yxs_comment_token_v1') || '';
          var stored = localStorage.getItem('yxs_comment_user_v1');
          authUser = stored ? JSON.parse(stored) : null;
        } catch (e) {}
        updateLoginState();
        if (authToken) {
          fetch('/waline/auth/me', { headers: authHeaders() })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data && data.ok) {
                authUser = data.user;
                try { localStorage.setItem('yxs_comment_user_v1', JSON.stringify(authUser)); } catch (e) {}
                updateLoginState();
              } else {
                clearSession();
              }
            })
            .catch(function () {});
        }
      }

      function loadCaptcha() {
        var row = document.getElementById('comment-login-captcha-row');
        var question = document.getElementById('comment-login-captcha-question');
        var answer = document.getElementById('comment-login-captcha-answer');
        if (!row || !question) return Promise.resolve(null);
        row.hidden = false;
        question.textContent = '请稍候…';
        if (answer) answer.value = '';
        captchaToken = '';
        captchaAnswer = '';
        return fetch('/waline/auth/captcha', { method: 'POST' })
          .then(function (response) { return response.json(); })
          .then(function (data) {
            if (data && data.ok) {
              captchaToken = String(data.token || '');
              question.textContent = '请计算 ' + data.a + ' + ' + data.b + ' = ?';
              return data;
            }
            question.textContent = '验证码获取失败，请刷新页面重试';
            return null;
          })
          .catch(function () {
            question.textContent = '验证码获取失败，请稍后再试';
            return null;
          });
      }

      function logout() {
        fetch('/waline/auth/logout', { method: 'POST', headers: authHeaders() })
          .catch(function () {})
          .finally(function () {
            clearSession();
          });
      }

      function loginOrRegister() {
        var status = document.getElementById('comment-login-status');
        var nick = document.getElementById('comment-login-nick');
        var email = document.getElementById('comment-login-email');
        var password = document.getElementById('comment-login-password');
        var captchaInput = document.getElementById('comment-login-captcha-answer');
        if (!nick || !email || !password) return;
        if (!captchaToken || !captchaInput || !captchaInput.value.trim()) {
          setStatus(status, '请先完成人机验证');
          loadCaptcha();
          return;
        }
        captchaAnswer = captchaInput.value.trim();
        setStatus(status, '请稍候…');

        var payload = {
          nick: nick.value.trim(),
          email: email.value.trim(),
          password: password.value,
          captchaToken: captchaToken,
          captchaAnswer: captchaAnswer,
        };
        fetch('/waline/auth/register', {
          method: 'POST',
          headers: getPostHeaders(),
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            return r.json().then(function (data) {
              return { status: r.status, data: data };
            });
          })
          .then(function (result) {
            if (result.status === 409) {
              return fetch('/waline/auth/login', {
                method: 'POST',
                headers: getPostHeaders(),
                body: JSON.stringify({
                  email: payload.email,
                  password: payload.password,
                  captchaToken: payload.captchaToken,
                  captchaAnswer: payload.captchaAnswer,
                }),
              }).then(function (r) {
                return r.json().then(function (data) {
                  return { status: r.status, data: data };
                });
              });
            }
            return result;
          })
          .then(function (result) {
            if (!result.data || !result.data.ok) {
              throw new Error((result.data && result.data.message) || '登录失败');
            }
            saveSession(result.data);
            setStatus(status, '');
            var panel = document.getElementById('comment-login-panel');
            if (panel) panel.hidden = true;
            loadCustomEmojis();
          })
          .catch(function (err) {
            setStatus(status, err.message || '登录失败，请重试');
            if (err.message && err.message.indexOf('人机验证') !== -1) loadCaptcha();
          });
      }

      function renderCustomEmojis() {
        var list = document.getElementById('emoji-maker-list');
        if (!list) return;
        list.textContent = '';

        function addSection(title, items, mine) {
          if (!items.length) return;
          var heading = document.createElement('p');
          heading.className = 'emoji-maker-empty';
          heading.textContent = title;
          list.appendChild(heading);

          items.forEach(function (item) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'emoji-item';
            btn.title = item.name;

            var img = document.createElement('img');
            img.src = item.image || item.url || '';
            img.alt = item.name;
            btn.appendChild(img);

            var name = document.createElement('span');
            name.className = 'emoji-item-name';
            name.textContent = item.name;
            btn.appendChild(name);

            btn.addEventListener('click', function () {
              insertCustomEmoji(item.image || item.url || '', item.name);
            });

            if (mine) {
              var badge = document.createElement('span');
              badge.className = 'emoji-badge';
              badge.textContent = item.visibility === 'private' ? '自留' : '公开';
              btn.appendChild(badge);

              var del = document.createElement('button');
              del.type = 'button';
              del.className = 'emoji-delete';
              del.textContent = '×';
              del.title = '删除';
              del.addEventListener('click', function (event) {
                event.stopPropagation();
                deleteCustomEmoji(item);
              });
              btn.appendChild(del);
            }
            list.appendChild(btn);
          });
        }

        addSection('大家的 · ' + customPublic.length, customPublic, false);
        addSection('我的 · ' + customMine.length, customMine, true);

        if (!customPublic.length && !customMine.length) {
          var empty = document.createElement('p');
          empty.className = 'emoji-maker-empty';
          empty.textContent = '还没有自制表情，登录后上传一张试试。';
          list.appendChild(empty);
        }
      }

      function loadCustomEmojis() {
        fetch('/waline/emoji', { headers: authHeaders() })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.ok) {
              customPublic = data.emojis || [];
              renderCustomEmojis();
            }
          })
          .catch(function () {});

        if (!authToken) return;
        fetch('/waline/emoji?scope=mine', { headers: authHeaders() })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.ok) {
              customMine = data.emojis || [];
              renderCustomEmojis();
            }
          })
          .catch(function () {});
      }

      function insertCustomEmoji(src, name) {
        var editor = document.querySelector('#waline .wl-editor');
        var status = document.getElementById('emoji-status');
        if (!editor) {
          setStatus(status, '等评论区加载后再插入');
          return;
        }
        // 防止表情名里的 ] / ( 等字符破坏 Markdown 结构，插入时只保留安全字符
        var safeName = String(name).replace(/[\\\[\]()]/g, '');
        var markdown = '![' + safeName + '](' + src + ')';
        editor.focus();
        var start = editor.selectionStart != null ? editor.selectionStart : editor.value.length;
        var end = editor.selectionEnd != null ? editor.selectionEnd : start;
        editor.setRangeText(markdown, start, end, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }

      function deleteCustomEmoji(item) {
        if (!item || !item.id) return;
        fetch('/waline/emoji/' + item.id, { method: 'DELETE', headers: authHeaders() })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.ok) {
              customMine = customMine.filter(function (emoji) { return emoji.id !== item.id; });
              customPublic = customPublic.filter(function (emoji) { return emoji.id !== item.id; });
              renderCustomEmojis();
            }
          })
          .catch(function () {});
      }

      function saveCustomEmoji() {
        var status = document.getElementById('emoji-status');
        var nameInput = document.getElementById('emoji-name');
        var visibility = document.querySelector('input[name="emoji-visibility"]:checked');
        var name = nameInput ? nameInput.value.trim() : '';
        if (!authToken) {
          setStatus(status, '请先登录后再制作表情');
          var loginPanel = document.getElementById('comment-login-panel');
          if (loginPanel) loginPanel.hidden = false;
          return;
        }
        if (!name || !currentEmojiImage) {
          setStatus(status, '请填写表情名并选择图片');
          return;
        }
        setStatus(status, '保存中…');
        fetch('/waline/emoji', {
          method: 'POST',
          headers: getPostHeaders(),
          body: JSON.stringify({
            name: name,
            image: currentEmojiImage,
            visibility: visibility ? visibility.value : 'public',
          }),
        })
          .then(function (r) {
            return r.json().then(function (data) {
              return { status: r.status, data: data };
            });
          })
          .then(function (result) {
            if (!result.data || !result.data.ok) {
              throw new Error((result.data && result.data.message) || '保存失败');
            }
            customMine.unshift(result.data.emoji);
            if (result.data.emoji.visibility === 'public') {
              customPublic.unshift(result.data.emoji);
            }
            renderCustomEmojis();
            setStatus(status, '已保存');
            var nameInput = document.getElementById('emoji-name');
            var fileInput = document.getElementById('emoji-file');
            if (nameInput) nameInput.value = '';
            if (fileInput) fileInput.value = '';
            currentEmojiImage = '';
            var preview = document.getElementById('emoji-preview');
            if (preview) {
              preview.hidden = true;
              preview.removeAttribute('src');
            }
          })
          .catch(function (err) {
            setStatus(status, err.message || '保存失败，请重试');
          });
      }

      function handleEmojiFile(event) {
        var status = document.getElementById('emoji-status');
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        if (file.size > 128 * 1024) {
          setStatus(status, '图片不能超过 128KB');
          event.target.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          currentEmojiImage = String(reader.result || '');
          var preview = document.getElementById('emoji-preview');
          if (preview) {
            preview.src = currentEmojiImage;
            preview.hidden = false;
          }
        };
        reader.onerror = function () {
          setStatus(status, '图片读取失败');
        };
        reader.readAsDataURL(file);
      }

      function setupCustomEmoji() {
        var loginToggle = document.getElementById('comment-login-toggle');
        var loginPanel = document.getElementById('comment-login-panel');
        var loginSubmit = document.getElementById('comment-login-submit');
        var captchaRefresh = document.getElementById('comment-login-captcha-refresh');
        var emojiToggle = document.getElementById('emoji-maker-toggle');
        var emojiPanel = document.getElementById('emoji-maker-panel');
        var emojiSave = document.getElementById('emoji-save');
        var emojiFile = document.getElementById('emoji-file');
        var deleteAccount = document.getElementById('comment-delete-account');

        if (loginToggle) {
          loginToggle.addEventListener('click', function () {
            if (authUser) {
              logout();
              return;
            }
            if (loginPanel) loginPanel.hidden = !loginPanel.hidden;
            if (loginPanel && !loginPanel.hidden) loadCaptcha();
          });
        }
        if (captchaRefresh) captchaRefresh.addEventListener('click', loadCaptcha);
        if (loginSubmit) loginSubmit.addEventListener('click', loginOrRegister);
        if (emojiToggle && emojiPanel) {
          emojiToggle.addEventListener('click', function () {
            emojiPanel.hidden = !emojiPanel.hidden;
            if (!emojiPanel.hidden) loadCustomEmojis();
          });
        }
        if (emojiSave) emojiSave.addEventListener('click', saveCustomEmoji);
        if (emojiFile) emojiFile.addEventListener('change', handleEmojiFile);
        if (deleteAccount) {
          deleteAccount.addEventListener('click', function () {
            var status = document.getElementById('comment-login-status');
            if (!authToken || !authUser) {
              setStatus(status, '请先登录');
              return;
            }
            if (!window.confirm('确定注销这个评论账号吗？自制表情也会一并删除，且无法恢复。')) return;
            fetch('/waline/auth/me', { method: 'DELETE', headers: authHeaders() })
              .then(function (r) { return r.json(); })
              .then(function (data) {
                if (data && data.ok) {
                  clearSession();
                  setStatus(status, '账号已注销');
                } else {
                  setStatus(status, (data && data.message) || '注销失败，请重试');
                }
              })
              .catch(function () {
                setStatus(status, '注销失败，请重试');
              });
          });
        }
      }

      function failMessage() {
        if (!empty) return;
        var title = empty.querySelector('.comment-empty-title');
        var text = empty.querySelector('.comment-empty-text');
        if (title) title.textContent = '评论暂时没有加载出来';
        if (text) {
          text.innerHTML = '可以稍后刷新，或到 <a href="/subscribe/">订阅页</a> 留下邮箱。';
        }
        empty.hidden = false;
      }

      function installWalineFetch() {
        if (window.__walineAuthFetchInstalled) return;
        var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
        if (!nativeFetch) return;
        window.__walineAuthFetchInstalled = true;
        window.fetch = function (input, init) {
          var request;
          try {
            request = new Request(input, init || {});
          } catch (e) {
            return nativeFetch(input, init);
          }
          var url = request.url || String(input || '');
          var method = String(request.method || 'GET').toUpperCase();
          var isCommentWrite = /\/waline\/comment(?:\/|$)/.test(url) &&
            (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH');
          if (isCommentWrite && authToken) {
            request.headers.set('Authorization', 'Bearer ' + authToken);
          }
          var promise = nativeFetch(request);
          if (!isCommentWrite) return promise;
          return promise.then(function (response) {
            if (response && response.status === 401) {
              var state = document.getElementById('comment-user-state');
              var panel = document.getElementById('comment-login-panel');
              var status = document.getElementById('comment-login-status');
              if (state) state.textContent = '请先登录后再评论';
              if (status) status.textContent = '请先登录后再评论';
              if (panel) panel.hidden = false;
            }
            return response;
          });
        };
      }

      function boot() {
        if (!window.Waline) {
          if (tries-- > 0) {
            setTimeout(boot, 250);
            return;
          }
          failMessage();
          return;
        }

        try {
          inst = window.Waline.init({
            el: el,
            serverURL: serverURL,
            path: window.location.pathname,
            lang: 'zh-CN',
            dark: document.documentElement.getAttribute('data-theme') === 'dark',
            emoji: ['/vendor/emojis/weibo'],
            reaction: [
              '/vendor/emojis/tieba/tieba_agree.png',
              '/vendor/emojis/tieba/tieba_look_down.png',
              '/vendor/emojis/tieba/tieba_sunglasses.png',
              '/vendor/emojis/tieba/tieba_pick_nose.png',
              '/vendor/emojis/tieba/tieba_awkward.png',
              '/vendor/emojis/tieba/tieba_sleep.png',
            ],
            login: 'disable',
            search: false,
            copyright: false,
            meta: ['nick', 'mail'],
            requiredMeta: ['nick'],
            locale: {
              nick: '昵称',
              mail: '邮箱',
              link: '网站（选填）',
              optional: '选填',
              placeholder: '写点什么，或留下邮箱…',
              sofa: '这里还空着，等你留下一句话',
              submit: '寄 出',
              like: '喜欢',
              cancelLike: '取消喜欢',
              reply: '回 复',
              cancelReply: '取消回复',
              comment: '评 论',
              refresh: '重新加载',
              more: '查看更多',
              preview: '预览',
              emoji: '表情',
              uploadImage: '上传图片',
              seconds: '秒前',
              minutes: '分钟前',
              hours: '小时前',
              days: '天前',
              now: '刚刚',
              admin: '作者',
              approved: '已通过',
              waiting: '待审核',
              spam: '垃圾',
              reactionTitle: '你觉得呢？',
              login: '登录',
              logout: '退出',
            },
          });

          if (empty) empty.hidden = true;
          loadAccount();
          loadCustomEmojis();

          new MutationObserver(function () {
            if (inst && inst.updateConfig) {
              inst.updateConfig({
                dark: document.documentElement.getAttribute('data-theme') === 'dark',
              });
            }
          }).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
          });
        } catch (e) {
          failMessage();
        }
      }

      setupCustomEmoji();
      loadAccount();
      installWalineFetch();

      function loadWalineScript() {
        var s = document.createElement("script");
        s.src = "/vendor/waline.js";
        s.async = true;
        s.onload = boot;
        s.onerror = failMessage;
        document.head.appendChild(s);
      }

      if (typeof IntersectionObserver === "function") {
        var observer = new IntersectionObserver(function (entries) {
          if (entries.some(function (entry) { return entry.isIntersecting; })) {
            observer.disconnect();
            loadWalineScript();
          }
        }, { rootMargin: "400px 0px" });
        observer.observe(el);
      } else {
        loadWalineScript();
      }
    })();
