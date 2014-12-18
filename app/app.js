'use strict';

angular.module('shipyard', [
        'ngRoute',
        'ngCookies',
        'shipyard.filters',
        'shipyard.services',
        'shipyard.controllers',
        'shipyard.utils',
        'shipyard.directives',
        'angular-flash.service',
        'angular-flash.flash-alert-directive',
        'angles',
        'ansiToHtml'
    ])
    .config(['$routeProvider', '$httpProvider', '$provide', 'flashProvider',
        function ($routeProvider, $httpProvider, $provide, flashProvider) {
            $routeProvider.when('/login', {
                templateUrl: 'templates/login.html',
                controller: 'LoginController'
            });
            $routeProvider.when('/logout', {
                template: "",
                controller: 'LogoutController'
            });
            $routeProvider.when('/dashboard', {
                templateUrl: 'templates/dashboard.html',
                controller: 'DashboardController'
            });
            $routeProvider.when('/applications',{
                templateUrl: 'templates/applications.html',
                controller: 'ApplicationsController'
            });
            $routeProvider.when('/applications/application_deploy', {
                templateUrl: 'templates/application_deploy.html',
                controller: 'ApplicationDeployController'
            });
            $routeProvider.when('/applications/:id', {
                templateUrl: 'templates/application_details.html',
                controller: 'ApplicationDetailsController'
            });
            $routeProvider.when('/containers', {
                templateUrl: 'templates/containers.html',
                controller: 'ContainersController'
            });
            $routeProvider.when('/containers/deploy', {
                templateUrl: 'templates/deploy.html',
                controller: 'DeployController'
            });
            $routeProvider.when('/containers/:id', {
                templateUrl: 'templates/container_details.html',
                controller: 'ContainerDetailsController'
            });
            $routeProvider.when('/containers/:id/logs', {
                templateUrl: 'templates/container_logs.html',
                controller: 'ContainerLogsController'
            });
            $routeProvider.when('/engines', {
                templateUrl: 'templates/engines.html',
                controller: 'EnginesController'
            });
            $routeProvider.when('/engines/add', {
                templateUrl: 'templates/engine_add.html',
                controller: 'EngineAddController'
            });
            $routeProvider.when('/engines/:id', {
                templateUrl: 'templates/engine_details.html',
                controller: 'EngineDetailsController'
            });
            $routeProvider.when('/events', {
                templateUrl: 'templates/events.html',
                controller: 'EventsController'
            });
            $routeProvider.otherwise({
                redirectTo: '/dashboard'
            });
            $provide.factory('httpInterceptor', function ($q, $window, flash, AuthToken) {
                return {
                    request: function (config) {
                        return config || $q.when(config);
                    },
                    requestError: function (rejection) {
                        return $q.reject(rejection);
                    },
                    response: function (response) {
                        return response || $q.when(response);
                    },
                    responseError: function (rejection) {
                        switch (rejection.status) {
                            case 401:
                                AuthToken.delete();
                                $window.location.href = '/#/login';
                                $window.location.reload();
                                return $q.reject(rejection);
                                break;
                            case 403:
                                flash.error = 'Invalid username/password';
                                break;
                        }
                        return $q.reject(rejection);
                    }
                };
            });
            $httpProvider.interceptors.push('httpInterceptor');
            // messages
            flashProvider.errorClassnames.push('red');
            flashProvider.warnClassnames.push('yellow');
            flashProvider.infoClassnames.push('blue');
            flashProvider.successClassnames.push('green');
        }]);


Chart.defaults.global.responsive = true;
Chart.defaults.global.animation = false;
Chart.defaults.global.showTooltips = true;
