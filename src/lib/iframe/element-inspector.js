/**
 * Element inspector script for frame iframes.
 * Injected into frame HTML to enable selectable/editable elements:
 * - Assigns data-uxm-element-id to DOM elements
 * - Listens for parent messages: GET_ELEMENT_INFO, HIGHLIGHT_ELEMENT, SELECT_ELEMENT,
 *   HIDE_ELEMENT, UPDATE_TEXT, ADD_CLASS, REMOVE_CLASS, TOGGLE_CLASS, GET_CLASSES
 * - Responds with ELEMENT_INFO, TEXT_UPDATED, CLASSES_UPDATED, ELEMENT_CLASSES, IFRAME_READY
 */
(function () {
  var ELEMENT_ID_ATTR = "data-uxm-element-id";
  var ID_PREFIX = "uxm-";
  var counter = 0;

  function ensureElementIds(doc) {
    var body = doc.body;
    if (!body) return;
    var walk = function (el) {
      if (!el || el.nodeType !== 1) return;
      if (
        el.tagName === "SCRIPT" ||
        el.tagName === "STYLE" ||
        el.tagName === "HEAD"
      )
        return;
      if (!el.getAttribute(ELEMENT_ID_ATTR)) {
        counter += 1;
        el.setAttribute(ELEMENT_ID_ATTR, ID_PREFIX + counter);
      }
      var child = el.firstElementChild;
      while (child) {
        walk(child);
        child = child.nextElementSibling;
      }
    };
    walk(body);
  }

  function getElementInfo(el) {
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    var computed = window.getComputedStyle(el);
    var hasText =
      el.childNodes &&
      el.childNodes.length > 0 &&
      Array.from(el.childNodes).some(function (n) {
        return n.nodeType === 3 && n.textContent && n.textContent.trim();
      });
    return {
      elementId: el.getAttribute(ELEMENT_ID_ATTR),
      tagName: el.tagName ? el.tagName.toLowerCase() : "",
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      text: hasText ? el.textContent.trim() : null,
      innerHTML: hasText ? el.innerHTML : null,
      isTextElement: !!hasText,
      styles: {
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontFamily: computed.fontFamily,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        textAlign: computed.textAlign,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        padding: computed.padding,
        margin: computed.margin,
        display: computed.display,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        whiteSpace: computed.whiteSpace,
        wordBreak: computed.wordBreak,
        overflowWrap: computed.overflowWrap,
        overflow: computed.overflow,
        textOverflow: computed.textOverflow,
        wordSpacing: computed.wordSpacing,
        textTransform: computed.textTransform,
        textIndent: computed.textIndent,
        backgroundImage: computed.backgroundImage,
        backgroundClip: computed.backgroundClip,
        webkitBackgroundClip:
          computed.webkitBackgroundClip || computed.backgroundClip,
        webkitTextFillColor: computed.webkitTextFillColor || "",
        borderWidth: computed.borderWidth,
        borderStyle: computed.borderStyle,
        borderColor: computed.borderColor,
        borderRadius: computed.borderRadius,
      },
    };
  }

  function findElementByPoint(x, y) {
    var el = document.elementFromPoint(x, y);
    while (el && el !== document.body) {
      if (el.getAttribute(ELEMENT_ID_ATTR)) return el;
      el = el.parentElement;
    }
    return el && el.getAttribute(ELEMENT_ID_ATTR) ? el : null;
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || typeof data !== "object" || !data.type) return;
    var type = data.type;
    var payload = data.payload || {};

    switch (type) {
      case "REQUEST_READY":
        window.parent.postMessage(
          { type: "IFRAME_READY", source: "element-inspector" },
          "*",
        );
        break;

      case "GET_ELEMENT_INFO": {
        var x = payload.x;
        var y = payload.y;
        if (typeof x !== "number" || typeof y !== "number") return;
        var target = findElementByPoint(x, y);
        if (target) {
          window.parent.postMessage(
            { type: "ELEMENT_INFO", payload: getElementInfo(target) },
            "*",
          );
        }
        break;
      }

      case "HIGHLIGHT_ELEMENT": {
        var elementId = payload.elementId;
        var highlight = payload.highlight === true;
        document
          .querySelectorAll("[" + ELEMENT_ID_ATTR + "]")
          .forEach(function (el) {
            el.style.outline = "";
          });
        if (highlight && elementId) {
          var el = document.querySelector(
            "[" + ELEMENT_ID_ATTR + '="' + elementId + '"]',
          );
          if (el) el.style.outline = "2px solid #3b82f6";
        }
        break;
      }

      case "SELECT_ELEMENT": {
        document
          .querySelectorAll("[" + ELEMENT_ID_ATTR + "]")
          .forEach(function (el) {
            el.style.outline = "";
          });
        break;
      }

      case "HIDE_ELEMENT": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el) {
          el.style.visibility = payload.hide ? "hidden" : "visible";
          // Tag with edit-sync attribute so overlay and iframe element are linked
          if (payload.hide) {
            el.setAttribute("data-uxm-edit-sync", payload.elementId);
          } else {
            el.removeAttribute("data-uxm-edit-sync");
          }
        }
        break;
      }

      case "SYNC_TEXT": {
        // Silent live sync — updates the element without sending a response (no re-render in parent)
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el) {
          el.innerHTML = payload.newText != null ? payload.newText : "";
        }
        break;
      }

      case "UPDATE_TEXT": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el) {
          el.innerHTML = payload.newText != null ? payload.newText : "";
          var rect = el.getBoundingClientRect();
          window.parent.postMessage(
            {
              type: "TEXT_UPDATED",
              payload: {
                elementId: payload.elementId,
                newText: el.innerHTML,
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                },
              },
            },
            "*",
          );
        }
        break;
      }

      case "ADD_CLASS": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el && payload.className) {
          payload.className.split(/\s+/).forEach(function (c) {
            if (c.trim()) el.classList.add(c.trim());
          });
          window.parent.postMessage(
            {
              type: "CLASSES_UPDATED",
              payload: {
                elementId: payload.elementId,
                classes: Array.from(el.classList),
              },
            },
            "*",
          );
        }
        break;
      }

      case "REMOVE_CLASS": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el && payload.className) {
          payload.className.split(/\s+/).forEach(function (c) {
            if (c.trim()) el.classList.remove(c.trim());
          });
          window.parent.postMessage(
            {
              type: "CLASSES_UPDATED",
              payload: {
                elementId: payload.elementId,
                classes: Array.from(el.classList),
              },
            },
            "*",
          );
        }
        break;
      }

      case "TOGGLE_CLASS": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el && payload.className) {
          el.classList.toggle(payload.className.trim());
          window.parent.postMessage(
            {
              type: "CLASSES_UPDATED",
              payload: {
                elementId: payload.elementId,
                classes: Array.from(el.classList),
              },
            },
            "*",
          );
        }
        break;
      }

      case "GET_CLASSES": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el) {
          window.parent.postMessage(
            {
              type: "ELEMENT_CLASSES",
              payload: {
                elementId: payload.elementId,
                classes: Array.from(el.classList),
              },
            },
            "*",
          );
        }
        break;
      }

      case "APPLY_STYLE": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el && payload.styles && typeof payload.styles === "object") {
          var styles = payload.styles;
          Object.keys(styles).forEach(function (key) {
            if (styles[key] != null && styles[key] !== "") {
              el.style[key] = styles[key];
            }
          });
        }
        break;
      }

      case "DELETE_ELEMENT": {
        var el = document.querySelector(
          "[" + ELEMENT_ID_ATTR + '="' + payload.elementId + '"]',
        );
        if (el && el.parentNode) {
          var elementId = payload.elementId;
          el.parentNode.removeChild(el);
          window.parent.postMessage(
            { type: "ELEMENT_DELETED", payload: { elementId: elementId } },
            "*",
          );
        }
        break;
      }

      case "GET_FONT_RESOURCES": {
        var fontFaceRules = [];
        var fontLinkHrefs = [];
        try {
          // Extract @font-face rules from stylesheets
          var sheets = document.styleSheets;
          for (var i = 0; i < sheets.length; i++) {
            try {
              var rules = sheets[i].cssRules || sheets[i].rules;
              if (!rules) continue;
              for (var j = 0; j < rules.length; j++) {
                if (rules[j].type === CSSRule.FONT_FACE_RULE) {
                  fontFaceRules.push(rules[j].cssText);
                }
              }
            } catch (e) {
              // Cross-origin stylesheet, try to get href
              if (sheets[i].href) fontLinkHrefs.push(sheets[i].href);
            }
          }
          // Extract <link> tags for font stylesheets
          document
            .querySelectorAll('link[rel="stylesheet"]')
            .forEach(function (link) {
              var href = link.getAttribute("href") || "";
              if (href && (href.includes("fonts") || href.includes("font"))) {
                fontLinkHrefs.push(
                  href.startsWith("http")
                    ? href
                    : new URL(href, document.baseURI).href,
                );
              }
            });
        } catch (e) {
          /* ignore */
        }
        window.parent.postMessage(
          {
            type: "FONT_RESOURCES",
            payload: {
              fontFaceRules: fontFaceRules,
              fontLinkHrefs: fontLinkHrefs,
            },
          },
          "*",
        );
        break;
      }

      default:
        break;
    }
  });

  function init() {
    ensureElementIds(document);
    if (document.readyState === "complete") {
      window.parent.postMessage(
        { type: "IFRAME_READY", source: "element-inspector" },
        "*",
      );
    } else {
      window.addEventListener("load", function () {
        window.parent.postMessage(
          { type: "IFRAME_READY", source: "element-inspector" },
          "*",
        );
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
