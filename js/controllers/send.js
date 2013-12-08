'use strict';

spApp.controller('sendCtrl', function($scope, $rootScope, $timeout, $routeParams) {

	var Wallet = SpareCoins.Wallet( SpareCoins.ChromeStorage )

	$rootScope.$watch('balance', function() {
		$scope.balance = $rootScope.balance
	})

	$scope.setTemp = function() {
		$scope.setState('normal')
		chrome.storage.local.set({"tempTimestamp": (new Date()).getTime()})
		chrome.storage.local.set({"tempAddress": $scope.inputAddress})
		chrome.storage.local.set({"tempAmount": $scope.inputAmount})
	}

	// States can be ["normal", "confirm", "sending", "sent"]
	$scope.setState = function(state) {
		$scope.state = state
	}

	function _removeTemp() {
		$scope.inputAddress = ""
		$scope.inputAmount = ""
		chrome.storage.local.remove("tempAddress")
		chrome.storage.local.remove("tempAmount")
	}

	function _resetForm() {
		$scope.form = {
			address: {
				css: "info",
				example: "e.g. 1FmdeybWTUsPj3QzDw3Y2X5YZNunugpcnA",
				valid: false,
			},
			amount: {
				css: "info",
				example: "e.g. 0.001",
				valid: false
			}
		}
	}

	$scope.setState('normal')

	$scope.button = {
		normal: {
			message: "SEND",
			css: "success"
		},
		confirm: {
			message: "CLICK TO CONFIRM",
			css: "warning"
		},
		sending: {
			message: "SENDING...",
			css: "warning"
		},
		sent: {
			message: "SENT!",
			css: "info"
		}
	}

	$scope.form = {}
	_resetForm()

	$scope.inputAddress = ""
	$scope.inputAmount = ""

	// TODO: Use Chrome Storage wrapper
	var tempData = ["tempTimestamp", "tempAddress", "tempAmount"]
	chrome.storage.local.get(tempData, function(obj) {
		var currentTime = (new Date()).getTime()
		var TTL = 5000
		var expiryTime = obj.tempTimestamp + TTL

		if (expiryTime < currentTime) {
			return _removeTemp();
		}

		$scope.inputAddress = obj.tempAddress
		$scope.inputAmount = obj.tempAmount
	})

	$scope.submitForm = function() {

		if (Wallet.getAddresses().length === 0) return;

		if (!$scope.form.address.valid || !$scope.form.amount.valid) return;

		if ($scope.state === 'sending' || $scope.state === 'sent') return;

		if ($scope.state === 'normal') {
			$scope.setState('confirm')
			return;
		}

		$scope.setState('sending')

		var satoshis = 100000000
		var toAddresses = [{
			addr: $scope.inputAddress,
			value: BigInteger.valueOf($scope.inputAmount * satoshis)
		}]

		Wallet.buildPendingTransaction(toAddresses, "password", function( pendingTransaction ) {
		  var s = pendingTransaction.serialize()
		  var tx_serialized = Crypto.util.bytesToHex(s);

		  var tx_hash = Crypto.util.bytesToHex(Crypto.SHA256(Crypto.SHA256(s, {asBytes: true}), {asBytes: true}).reverse());

		  BGPage.pushTransaction(tx_serialized, tx_hash, function() {
		  	// TODO:
				// on callback, update total balance to localStorage
	  		// on callback, update address balances to localStorage
			  // on callback, update txs to localStorage
			  // on callback, change $rootScope.balance to new balance

				$timeout(function() {
					$scope.setState('sent')

					// Backup Wallet if high value
					if ($scope.inputAmount >= 0.1) {
						BGPage.backupPrivateKeys()
					}
				})

				$timeout(function() {
					_removeTemp();
					_resetForm(); // hack
					$scope.setState('normal')
				}, 2000)

		  })

		}) ;
	}

})
