const SERVER = "http://localhost:3000";
(function(exports){
	var ticketfever = {
		_alert: $('#alert_msg'),
		init: function _init() {
			$('#selling_form').ajaxForm();
			$('#submit_selling_form').bind('click', this.submitSelling);
			$('#alert_msg a').bind('click', function(e){
				$('#alert_msg').hide();
				$('#alert_msg').addClass('in');
			});
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

			}
		}
	}

	exports.ticketFever = ticketfever;
})(window);

jQuery(function(){
	window.ticketFever.init();
})
