const SERVER = "http://localhost:3000";
(function(exports){
	var ticketfever = {
		_header_img: null,
		_alert: $('#alert_msg'),
		init: function _init () {
			this.countdown();
			$('#header_file').bind('change', this.handleHeaderUpload);
			$('#selling_form').ajaxForm();
			$('#submit_selling_form').bind('click', this.submitSelling);
			$('#alert_msg a').bind('click', function(e){
				$('#alert_msg').hide();
				$('#alert_msg').addClass('in');
			});
			$('#submit_event').bind('submit', this.createEvent);
			$('.event-header-input').click(this.uploadHeader);
			$('.event-header-input *').click(function(e){e.stopPropagation();});
		},
		uploadHeader: function _upload_header () {
			$('#header_file').trigger('click');
		},
		handleHeaderUpload: function _handle_header_upload (e) {
		    if (window.File && window.FileReader && window.FileList && window.Blob) {
		        var file = e.target.files[0];
		        var result = '';
	            // if the file is not an image, continue
	            if (!file.type.match('image/*')) {
	                ticketfever.message("error", "You didn't upload a picture");
	            }
	 
	            reader = new FileReader();
	            reader.onload = (function (tFile) {
	                return function (e) {
	                    $('.event-header-input').css('background-image', 'url('+e.target.result+')');
	                    ticketfever._header_img = e.target.result;
	                };
	            }(file));
	            reader.readAsDataURL(file);
		        
		    } else {
		        alert('The File APIs are not fully supported in this browser.');
		    }
		},
		createEvent: function _create_event () {
			var info = {};
			info.name = $(".event-name-input input").val();
			if(info.name.length == 0){
				ticketfever.message("error", "No Event Name");
				return;
			}
			info.date = $(".event-date-input input").val();
			if(info.date.length == 0) {
				ticketfever.message("error", "No Date");
				return;
			}
			info.event_nickname = $("#nick").val();
			if(info.event_nickname.length == 0) {
				ticketfever.message("error", "No Nickname");
				return;
			}
			info.max_price = $("#max_price").val();
			if(info.max_price.length == 0) {
				ticketfever.message("error", "No Max Price");
				return;
			}
			info.max_price = parseFloat(info.max_price, 10);
			info.url = $("#url").val();
			if(info.url.length == 0) {
				ticketfever.message("error", "No URL Specified");
				return;
			}
			if(!ticketfever._header_img) {
				ticketfever.message("error", "No Image Uploaded. Click On The Picture To Upload");
				return;
			}
		        info.e_mail = $('#e-mail').val();
			info.picture_path = ticketfever._header_img;
		        info.event_id = $('#eventId').val();
			$.ajax("/createEvent",{data:{event:info}, type: "POST", success: function(result){
			    
			    console.log(result);
			    result = JSON.parse(result);
			    window.location = SERVER+"/"+result.result.event_nickname;
			}});
		},
		message: function _message (type, msg) {
			$('#alert_msg').removeClass("alert-success alert-error alert-warning alert-info");
			if(type == "success" || type == "info" || type == "error" || type == "warning") {
				$('#alert_msg').addClass("alert-"+type);
				$('#alert_msg').find("span.message").html(msg);
				$('#alert_msg').show();
			}
		},
		openSell: function _open_sell () {
			if(ticketfever.user) {
				$("#sell_modal input#name").val(ticketfever.user.name.split(" ")[0]);
				$("#sell_modal input#last-name").val(ticketfever.user.name.split(" ")[1]);
				$("#sell_modal input#e-mail").val(ticketfever.user.email);
				$("#sell_modal").modal("show");
			} else {
				this.message("error", "You have to be logged in to sell a ticket.");
			}
		},
		openOffer: function _open_offer () {
			if(ticketfever.user && !ticketfever._invalid_offer) {
				$("#offer_modal input#name").val(ticketfever.user.name.split(" ")[0]);
				$("#offer_modal input#last-name").val(ticketfever.user.name.split(" ")[1]);
				$("#offer_modal input#e-mail").val(ticketfever.user.email);
				$("#offer_modal").modal("show");
			} else {
				this.message("error", "You have to be logged in to accept an offer.");
			}
		},
		checkFbStatus: function _check_fb_status () {
			FB.getLoginStatus(function(response) {
			  if (response.status === 'connected') {
			    ticketfever.getFbUser();
			  } else if (response.status === 'not_authorized') {
			    ticketfever.user = null;
			  } else {
			  	ticketfever.user = null;
			  }
			 });
		},
		login: function _login () {
			FB.login(function(rsp) {
              if(rsp.status == "connected") {
              	ticketfever.getFbUser();
              	  
              }
            }, {scope:'email'});
		},
		getFbUser: function _get_fb_user () {
			FB.api('/me', function(rsp) {
				ticketfever.user = rsp;
			  $("#user_name > a").html(rsp.name);
			  $("#log_in").hide();
			  $("#user_name").show();
			  $.ajax("/createUser", {
              			type: "POST",
              		        data: {user: ticketfever.user},
              		        success: function(rsp) {
              			rsp = JSON.parse(rsp);
              			ticketfever.user = rsp.result;
              		}
              	});
			  	ticketfever.requestMoreUserInfo();
			});
		},
		requestMoreUserInfo: function _request_more_user_info () {
			$.ajax("/user/"+ticketfever.user.id, {success: function(rsp){
				rsp = JSON.parse(rsp);
				ticketfever.user = rsp.result;
			}});
		},
		submitSelling: function _submit_selling () {
			$('#selling_form').ajaxSubmit({
				success: function(arg){ticketfever._sellCallback(arg);}
			});
		},
		denyOffer: function _deny_offer () {
			if(ticketfever.user) {
				$.ajax("/denyOffer", {
					type: "POST",
					data: window.ticketFever.user.id,
					success: function (result) {
						result = JSON.parse(result);
						//TODO
						ticketfever.message("Offer Denied!");
					}
				});
			} else {
				this.message("error", "You have to be logged in to deny an offer.");
			}
		},
		subscribeWaitinglist: function _subscribe_waitinglist (event_id) {
			if(ticketfever.user) {
				var txt = $(".buyer-option a").html();
				txt = txt == "Waiting for Offer" ? "Subscribe for Tickets" : "Waiting for Offer";
				$.ajax("/subscribeEvent/" + event_id + '/' + window.ticketFever.user.id, {
					type: "GET",
					data: window.ticketFever.user.id,
					success: function (result) {
						result = JSON.parse(result);
					}
				});
			} else {
				this.message("error", "You have to be logged in to subscribe to offers.");
			}
		},
		countdown: function _count_down () {
			var h = $(".event-offer .hours").html();
			var m = $(".event-offer .minutes").html();
			var s = $(".event-offer .seconds").html();

			if (h && m && s && h.length != 0 && m.length != 0 && s.length != 0) {
				h = parseInt(h, 10);
				m = parseInt(m, 10);
				s = parseInt(s, 10);

				this.loop(h, m, s);
			}
		},
		loop: function _loop (h, m, s) {
			setTimeout(function() {
					s--;
					m = s < 0 ? m-1 : m;
					h = m < 0 ? h-1 : h;
					h = h < 0 ? 23 : h;
					m = m < 0 ? 59 : m;
					s = s < 0 ? 59 : s;

					// if (h == 0 && m == 0 && s == 0) {
					// 	ticketfever.message("error", "Time is over!");
					// 	ticketfever._invalid_offer = true;
					// 	return;
					// }
					// 
					console.log(s);
					$(".event-offer .hours").html(h < 10 ? "0"+h : h);
					$(".event-offer .minutes").html(m < 10 ? "0"+m : m);
					$(".event-offer .seconds").html(s < 10 ? "0"+s : s);
					ticketfever.loop(h, m, s);
			}, 1000);
		},
		_sellCallback: function _sell_callback (result) {
		    $("#sell_modal").modal("hide");		
		}
	}

	exports.ticketFever = ticketfever;
})(window);

jQuery(function(){
	window.ticketFever.init();
})
