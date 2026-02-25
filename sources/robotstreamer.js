(function () {
	
	var isExtensionOn = true;
	
	function escapeHtml(unsafe){
		try {
			if (settings.textonlymode){
				return unsafe;
			}
			return unsafe
				 .replace(/&/g, "&amp;")
				 .replace(/</g, "&lt;")
				 .replace(/>/g, "&gt;")
				 .replace(/\"/g, "&quot;")
				 .replace(/'/g, "&#039;") || "";
		} catch(e){
			return "";
		}
	}

	function getAllContentNodes(element) {
		var resp = "";
		
		if (!element){return resp;}
		
		if (!element.childNodes || !element.childNodes.length){
			if (element.textContent){
				return escapeHtml(element.textContent) || "";
			}
			return "";
		}
		
		element.childNodes.forEach(node=>{
			if (node.childNodes && node.childNodes.length){
				resp += getAllContentNodes(node);
			} else if ((node.nodeType === 3) && node.textContent && (node.textContent.trim().length > 0)){
				resp += escapeHtml(node.textContent);
			} else if (node.nodeType === 1){
				if (!settings.textonlymode){
					if ((node.nodeName == "IMG") && node.src){
						node.src = node.src+"";
					}
					resp += node.outerHTML;
				} else if (node.nodeName === "BR"){
					resp += "\n";
				}
			}
		});
		return resp;
	}

	function processMessage(ele){
		if (!ele || !ele.classList || !ele.classList.contains("message")){
			return;
		}
		if (ele.marked || ele.dataset.ssProcessed){
			return;
		}

		var nameColor = "";
        var name = "";
		
		try {
			const nameEle = ele.querySelector(".message-info-name");
			if (nameEle){
				name = escapeHtml(nameEle.textContent).trim();
				nameColor = nameEle.style.color || "";
			}
		} catch(e){}
		
		if (!name){
			return;
		}

		var msg = "";
		try {
			msg = getAllContentNodes(ele.querySelector('.message-content')).trim();
		} catch(e){
			return;
		}

		if (!msg){
			return;
		}

		ele.marked = true;
		ele.dataset.ssProcessed = "true";
	
		var data = {};
		data.chatname = name;
		data.chatbadges = "";
		data.backgroundColor = "";
		data.textColor = "";
		data.nameColor = nameColor;
		data.chatmessage = msg;
		data.chatimg = "";
		data.hasDonation = "";
		data.membership = "";
		data.contentimg = "";
		data.textonly = settings.textonlymode || false;
		data.type = "robotstreamer";
		
		pushMessage(data);
	}
	
	function pushMessage(data){
		try{
			chrome.runtime.sendMessage(chrome.runtime.id, { "message": data }, function(){});
		} catch(e){}
	}
	
	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			try{
				if ("getSource" == request){sendResponse("robotstreamer");	return;	}
				if ("focusChat" == request){
					var input = document.querySelector('#chatinput, #message, input[type="text"], textarea');
					if (input){
						input.focus();
						sendResponse(true);
						return;
					}
				}
				if (typeof request === "object"){
					if ("settings" in request){
						settings = request.settings;
						sendResponse(true);
						return;
					}
				}
			} catch(e){}
			sendResponse(false);
		}
	);
	
	var settings = {};
	
	chrome.runtime.sendMessage(chrome.runtime.id, { "getSettings": true }, function(response){
		if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) { return; }
		response = response || {};
		if ("settings" in response){
			settings = response.settings;
		}
	});

	console.log("social stream injected");

	setInterval(function(){
		try {
			if (!isExtensionOn){return;}
			document.querySelectorAll('.message:not([data-ss-processed])').forEach(processMessage);
		} catch(e){}
	},500);

})();
