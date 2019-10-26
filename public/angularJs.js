var app = angular.module('myapp', ['ngRoute', 'ngStorage']);

app.factory('AuthInterceptor', function ($window, $q, $location) {
    return {
        request: function (config) {
            config.headers = config.headers || {};
            if ($window.localStorage.getItem('token')) {
                config.headers.token = $window.localStorage.getItem('token');
            }
            return config || $q.when(config);
        },
        response: function (response) {
            if (response.status === 401) {
                $location.path(['/login'])
            }
            return response || $q.when(response);
        }
    };
});

app.config(function ($httpProvider) {
    $httpProvider.interceptors.push('AuthInterceptor');
});

app.config(function ($routeProvider) {
    $routeProvider.when('/', {
        template: "<h2>Welcome to MEAN STACK</h2><br/><h4>Please login</h4>",
        controller: "appController"
    })

        .when('/signup', {
            templateUrl: "views/signup.html",
            controller: "signupController"
        })
        .when('/login', {
            templateUrl: "views/login.html",
            controller: "loginController"
        })
        .when('/home', {
            templateUrl: "views/home.html",
            resolve: ["authService", function (authService) {
                return authService.checkUserStatus();
            }]
        })
        .when('/messages', {
            templateUrl: "views/messages.html",
            controller: "displayMessagesController",
            resolve: ["authService", function (authService) {
                return authService.checkUserStatus();
            }]
        })
        .when('/messages', {
            templateUrl: "views/messages.html",
            controller: "displayMessagesController",
            resolve: ["authService", function (authService) {
                return authService.checkUserStatus();
            }]
        })
        .when('/sendMessage', {
            templateUrl: "views/sendMessage.html",
            controller: "sendMessageController",
            resolve: ["authService", function (authService) {
                return authService.checkUserStatus();
            }]
        })
        .when('/messages/:_id', {
            templateUrl: "views/messageDetail.html",
            controller: "detailsController",
            resolve: ["authService", function (authService) {
                return authService.checkUserStatus();
            }]
        })
        .otherwise({
            redirect: "/login"
        });
});

app.controller("appController", function ($rootScope, $location, authService, $window) {
    $rootScope.isLoggedIn = authService.checkUserStatus();
    if ($rootScope.isLoggedIn == false) {
        $window.localStorage.clear();
    }
    console.log($rootScope.isLoggedIn);
    $rootScope.logout = function () {
        $rootScope.isLoggedIn = authService.checkUserStatus();
        $window.localStorage.clear();
        console.log($rootScope.isLoggedIn);
        $location.path(["/login"]);
        return $rootScope.isLoggedIn;
    }

});

app.controller('signupController', function ($scope, $http, $location) {
    $scope.user = {};
    $scope.user.selectGender = function ($event) {
        $scope.user.selectGender = $event.target.value;
    };
    $scope.signup = function () {
        $scope.signupError = null;
        const userData = {
            "username": $scope.user.username,
            "password": $scope.user.password,
            "firstname": $scope.user.firstname,
            "lastname": $scope.user.lastname,
            "phone": $scope.user.phone,
            "gender": $scope.user.selectGender
        }

        $http.post("/signup", JSON.stringify(userData))
            .then(function (resp) {
                $location.path(['/login']);
            }, function (err) {
                $scope.signupError = "fill all the fields/ user alreday exists";
            });
    };
});

app.controller("loginController", function ($scope, $http, $localStorage, $window, $location, $rootScope, authService) {
    $scope.user = {};
    $scope.login = function () {
        $http.post("/login", this.user)
            .then((res) => {
                if (res.data.item.length > 0) {
                    $window.localStorage.setItem("token", JSON.stringify(res.data.token));
                    $window.localStorage.setItem("username", JSON.stringify(res.data.username));
                    $window.localStorage.setItem("isLoggedIn", "true");
                    $rootScope.isLoggedIn = authService.checkUserStatus();
                    $location.path(['/home']);
                }
                else {
                    console.log("error from clients IF block (resp)");
                    alert("invalid username or password");
                }

            })
            .catch((exp) => {
                alert("invalid username or password");
            });
    }
});

app.controller('sendMessageController', function ($scope, $http, $location, $window) {
    $scope.message = {};
    $scope.users = null;
    $http.get("/sendMessage", { header: $window.localStorage.getItem("token") })
        .then((resp) => {
            console.log(resp.data);
            $scope.users = resp.data;
        })
        .catch((exp) => {
            console.log("error occured");
        })
    $scope.message.sender = JSON.parse($window.localStorage.getItem("username"))
    //$scope.users = {};
    $scope.sendMessage = function () {
        const messageData = {
            "message_title": $scope.message.message_title,
            "message_body": $scope.message.message_body,
            "sender": $scope.message.sender,
            "receiver": $scope.users
        }
        $http.post("/sendMessage", messageData, {
            headers:
            {
                token: JSON.parse($window.localStorage.getItem("token"))
            }
        })
            .then((resp) => {
                console.log("message saved in database" + resp.data);
                $location.path(['/messages']);
            })
            .catch((err) => {
                console.log("error occured from client" + err.message);
            });
    };
});

app.controller("displayMessagesController", function ($scope, $http, $window, $location, $rootScope) {
    $scope.messages;
    $http.get('/messages', {
        headers: {
            token: JSON.parse($window.localStorage.getItem("token"))
        }
    })
        .then((resp) => {
            console.log(resp.data.messages);

            $scope.messages = resp.data.messages;

        },
            function (err) {
            })

    $scope.deleteMessage = function (message) {
        console.log(message._id);
        $http.delete('/messages/' + message._id, {
            headers: {
                token: JSON.parse($window.localStorage.getItem("token"))
            }
        })
            .then((resp) => {
                $http.get('/messages', {
                    headers: {
                        token: JSON.parse($window.localStorage.getItem("token"))
                    }
                })
                    .then((resp) => {
                        $scope.messages = resp.data.messages;
                    },
                        function (err) {
                        });
            })
            .catch((err) => {
                alert("error occured while deleting messages" + err.message);
            });
    }

    $rootScope.isMarkedImp = function (message) {
        $http.post("/messages/" + message._id, {
            headers: {
                token: JSON.parse($window.localStorage.getItem("token")),
                _id: message._id
            }
        })
            .then((resp) => {
                console.log(resp.data);
                $http.get('/messages', {
                    headers: {
                        token: JSON.parse($window.localStorage.getItem("token"))
                    }
                })
                    .then((res) => {
                        $scope.messages = res.data.messages;
                    },
                        function (err) {
                        });
            })
            .catch((err) => {
                console.log("error" + err.message);
            })
    }
});

app.controller("detailsController", function ($scope, $window, $http, $routeParams) {
    $scope.messages = [];
    var id = $routeParams._id;
    $http.get('/messages/' + id,
        {
            headers: {
                token: JSON.parse($window.localStorage.getItem('token'))
            }
        })
        .then((resp) => {
            $scope.messages = resp.data.findMessage;
        })
        .catch((exp) => {
            alert("error occured" + exp.message);
        });

});


app.factory("authService", function ($window, $rootScope, $location) {
    $rootScope.isLoggedIn = false;
    return {
        checkUserStatus: function () {
            if ($window.localStorage.getItem('isLoggedIn')) {
                return !$rootScope.isLoggedIn;
            }
            else {
                $location.path(['/login']);
                return $rootScope.isLoggedIn;
            }
        }
    }
});


