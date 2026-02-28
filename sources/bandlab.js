(function () {
	const SOURCE_TYPE = "bandlab";

	function getAllContentNodes(element, helpers) {
		let resp = "";
		if (!element) { return resp; }

		if (!element.childNodes || !element.childNodes.length) {
			if (element.nodeType === 3) {
				return helpers.escapeHtml(element.textContent || "");
			}
		}

		element.childNodes.forEach(function (node) {
			if (node.childNodes && node.childNodes.length) {
				if (!node.classList || !node.classList.contains("comment-see-more")) {
					resp += getAllContentNodes(node, helpers);
				}
			} else if (node.nodeType === 3 && node.textContent && node.textContent.trim().length > 0) {
				resp += helpers.escapeHtml(node.textContent);
			} else if (node.nodeType === 1 && !helpers.settings.textonlymode) {
				if (node.nodeName === "IMG" && node.src) { node.src = node.src + ""; }
				resp += node.outerHTML;
			}
		});
		return resp;
	}

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: ".comments > *, .live-chat-block > *, .comment-list-container>div > *",
		focusInputSelector: "textarea#commentField",
		parseRow: function (row, helpers) {
			let chatimg = "";
			let name = "";
			let userid = "";
			let msg = "";
			let contentimg = "";

			try {
				const img = row.querySelector(".comment-header>a>img[srcset]");
				if (img && img.srcset) {
					chatimg = "https://" + img.srcset.split("https://").pop().split(" ")[0];
				}
			} catch (e) {}

			try {
				const nameEle = row.querySelector(".comment-author-name, .live-message-body-author");
				if (nameEle) { name = helpers.escapeHtml((nameEle.textContent || "").trim()); }
			} catch (e) {}

			try {
				const userEle = row.querySelector(".live-message-body-author");
				if (userEle && userEle.href) { userid = userEle.href.split("/")[1] || ""; }
			} catch (e) {}

			try {
				const body = row.querySelector(".live-message-body");
				if (body) {
					body.childNodes.forEach(function (xx) {
						if (xx.classList && (xx.classList.contains("comment-author-name") || xx.classList.contains("live-message-body-author"))) { return; }
						if (xx.querySelector && xx.querySelector(".comment-author-name, .live-message-body-author")) { return; }
						msg += getAllContentNodes(xx, helpers);
					});
					msg = msg.trim();
				}
			} catch (e) {}

			try {
				const cimg = row.querySelector(".comment-content img[src]");
				if (cimg && cimg.src) { contentimg = cimg.src; }
			} catch (e) {}

			if (!msg && !contentimg) { return null; }
			if (!name) { return null; }

			return {
				dedupeKey: [name, msg, contentimg, userid].join("::"),
				data: {
					chatname: name,
					chatbadges: "",
					backgroundColor: "",
					textColor: "",
					userid: userid,
					chatmessage: msg,
					chatimg: chatimg,
					hasDonation: "",
					membership: "",
					contentimg: contentimg,
					textonly: helpers.settings.textonlymode || false,
					type: SOURCE_TYPE
				}
			};
		}
	});
})();
