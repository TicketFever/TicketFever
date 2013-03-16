const SERVER = "http://localhost:3000";
(function(exports){
	var ticketfever = {
		_header_img: null,
		_alert: $('#alert_msg'),
		init: function _init() {
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
			info.max_price = parseInt(info.max_price);
			info.url = $("#url").val();
			if(info.url.length == 0) {
				ticketfever.message("error", "No URL Specified");
				return;
			}
			if(!ticketfever._header_img) {
				ticketfever.message("error", "No Image Uploaded. Click On The Picture To Upload");
				return;
			}
			info.picture_path = ticketfever._header_img;
			$.ajax("/createEvent", {data: info, type: "POST", success: function(error, result){
				if(!error) {
					console.log(result);
				}
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
		openSell: function _open_sell() {
			if(ticketfever.user) {
				$("#sell_modal").modal("show");
			} else {
				this.message("error", "You have to be logged in to sell a ticket.");
			}
		},
		openOffer: function _open_offer() {
			if(ticketfever.user) {
				$("#offer_modal").modal("show");
			} else {
				this.message("error", "You have to be logged in to accept an offer.");
			}
		},
		checkFbStatus: function _check_fb_status() {
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
		login: function _login() {
			FB.login(function(rsp) {
              if(rsp.status == "connected") {
              	ticketfever.getFbUser();
              }
            }, {scope:''});
		},
		getFbUser: function _get_fb_user() {
			FB.api('/me', function(rsp) {
				ticketfever.user = rsp;
			  $("#user_name > a").html(rsp.name);
			  $("#log_in").hide();
			  $("#user_name").show();
			});
		},
		submitSelling: function _submit_selling() {
			$('#selling_form').ajaxSubmit('/createTicket', {
				success: this._sellCallback
			});
		},
		_sellCallback: function _sell_callback(error, result) {
			if(!error) {
				$("#sell_modal").modal("hide");
			}
		}
	}

	exports.ticketFever = ticketfever;
})(window);

jQuery(function(){
	window.ticketFever.init();
})
