'use strict';

angular.module('shipyard.controllers', ['ngCookies'])
        .controller('HeaderController', function($http, $scope, AuthToken) {
            $scope.template = 'templates/header.html';
            $scope.username = AuthToken.getUsername();
            $scope.isLoggedIn = AuthToken.isLoggedIn();
            $http.defaults.headers.common['X-Access-Token'] = AuthToken.get();
        })
        .controller('MenuController', function($scope, $location, $cookieStore, AuthToken) {
            $scope.template = 'templates/menu.html';
            $scope.isActive = function(path){
                if ($location.path().substr(0, path.length) == path) {
                    return true
                }
                return false
            }
            $scope.isLoggedIn = AuthToken.isLoggedIn();
        })
        .controller('LoginController', function($scope, $cookieStore, $window, flash, Login, AuthToken) {
            $scope.template = 'templates/login.html';
            $scope.login = function() {
                Login.login({username: $scope.username, password: $scope.password}).$promise.then(function(data){
                    AuthToken.save($scope.username, data.auth_token);
                    $window.location.href = '/#/dashboard';
                    $window.location.reload();
                }, function() {
                    flash.error = 'invalid username/password';
                });
            }
        })
        .controller('LogoutController', function($scope, $window, AuthToken) {
            AuthToken.delete();
            $window.location.href = '/#/login';
            $window.location.reload();
        })
        .controller('DashboardController', function($http, $scope, Events, ClusterInfo, AuthToken) {
            $scope.template = 'templates/dashboard.html';
            Events.query(function(data){
                $scope.events = data;
            });
            $scope.showX = function(){
                return function(d){
                    return d.key;
                };
            };
            $scope.showY = function(){
                return function(d){
                    return d.y;
                };
            };
            ClusterInfo.query(function(data){
                $scope.chartOptions = {};
                $scope.clusterInfo = data;
                $scope.clusterCpuData = [
                    { label: "Free", value: data.cpus, color: "#184465" },
                    { label: "Reserved", value: 0, color: "#6D91AD" }
                ];
                if (data.cpus != undefined && data.reserved_cpus != undefined) {
                    $scope.clusterCpuData[0].value = data.cpus - data.reserved_cpus;
                    $scope.clusterCpuData[1].value = data.reserved_cpus;
                }
                $scope.clusterMemoryData = [
                    { label: "Free", value: data.memory, color: "#184465" },
                    { label: "Reserved", value: 0, color: "#6D91AD" }
                ];
                if (data.memory != undefined && data.reserved_memory != undefined) {
                    $scope.clusterMemoryData[0].value = data.memory - data.reserved_memory;
                    $scope.clusterMemoryData[1].value = data.reserved_memory;
                }
            });
        })

        .controller('ContainersController', function($scope, $location, Containers) {
            $scope.orderByField = 'id';
            $scope.reverseSort = false;

            $scope.go = function() {
                $location.path("/containers/" + this.c.id)
            }

            $scope.selectSortColumn = function(field) {
                $scope.reverseSort = !$scope.reverseSort;
                $scope.orderByField = field;
            }

            $scope.sortedTableHeading = function(field) {
                if($scope.orderByField != field) {
                    return "";
                } else {
                    if($scope.reverseSort == true) {
                        return "descending";
                    } else {
                        return "ascending";
                    }
                }
            }

            $scope.template = 'templates/containers.html';
            Containers.query(function(data){
                $scope.containers = data;
            });
        })
        .controller('DeployController', function($scope, $location, Engines, Container) {
            var types = [
                "service",
                //"engine", // removed until we get the UI to show engines to select
                "unique"
            ];
            var networkModes = [
                "bridge",
                "none",
                "container",
                "host"
            ]
            var restartPolicies = [
                "no",
                "on-failure",
                "always"
            ]
            $scope.cpus = 0.1;
            $scope.memory = 256;
            $scope.maxRestarts = "";
            $scope.environment = "";
            $scope.hostname = "";
            $scope.domain = "";
            $scope.count = 1;
            $scope.publish = false;
            $scope.args = null;
            $scope.links = null;
            $scope.volumes = null;
            $scope.pull = true;
            $scope.types = types;
            $scope.selectType = function(type) {
                $scope.selectedType = type;
                $(".ui.dropdown").dropdown('hide');
            };
            $scope.selectedNetworkMode = 'bridge';
            $scope.networkModes = networkModes;
            $scope.selectNetworkMode = function(mode) {
                $scope.selectedNetworkMode = mode;
                if (mode === 'container') {
                    $scope.showNetworkModeContainer = true;
                } else {
                    $scope.showNetworkModeContainer = false;
                }
                $(".ui.dropdown").dropdown('hide');
            };
            $scope.selectedRestartPolicy = 'no';
            $scope.restartPolicies = restartPolicies;
            $scope.selectRestartPolicy = function(policy) {
                $scope.selectedRestartPolicy = policy;
                if (policy == 'on-failure') {
                    $scope.showMaxRestarts = true;
                } else {
                    $scope.showMaxRestarts = false;
                }
                $(".ui.dropdown").dropdown('hide');
            }
            var labels = [];
            Engines.query(function(engines){
                angular.forEach(engines, function(e) {
                    angular.forEach(e.engine.labels, function(l){
                        if (labels.indexOf(l) == -1) {
                            this.push(l);
                        }
                    }, labels);
                });
                $scope.labels = labels;
            });
            $scope.addPortDefinition = addPortDefinition;
            $scope.showLoader = function() {
                $(".ui.loader").removeClass("disabled");
                $(".ui.active").addClass("dimmer");
            };
            $scope.hideLoader = function() {
                $(".ui.loader").addClass("disabled");
                $(".ui.active").removeClass("dimmer");
            };
            $scope.deploy = function() {
                $scope.showLoader();
                var valid = $(".ui.form").form('validate form');
                if (!valid) {
                    $scope.hideLoader();
                    return false;
                }
                var selectedLabels = [];
                $(".ui.checkbox.engine-label").children(":checked").each(function(i, sel){
                    // HACK: use the label text to set the value
                    selectedLabels.push($(sel).next().text());
                });
                // format environment
                var envParts = $scope.environment.match(/(?:['"].+?['"])|\S+/g);
                var environment = {};
                if (envParts != null) {
                    for (var i=0; i<envParts.length; i++) {
                        var env = envParts[i].split(/=(.+)?/)
                        environment[env[0]] = env[1];
                    }
                }
                if ($scope.args != null) {
                    var args = $scope.args.split(" ");
                }
                // network mode
                var networkMode = $scope.selectedNetworkMode;
                if ($scope.selectedNetworkMode == 'container') {
                    var containerName = $scope.networkModeContainerName;
                    networkMode = 'container:' + containerName;
                    if (containerName == undefined || containerName == "") {
                        $("div#networkMode").addClass("error");
                        $scope.error = "you must specify a container name for the container network mode";
                        $scope.hideLoader();
                        valid = false;
                        return false;
                    }
                }
                // links
                var links = {};
                if ($scope.links != null) {
                    var linkParts = $scope.links.split(" ");
                    if (linkParts != "") {
                        for (var i=0; i<linkParts.length; i++) {
                            var l = linkParts[i].split(":");
                            links[l[0]] = l[1];
                        }
                    }
                }
                // volumes
                var volumes = [];
                if ($scope.volumes != null) {
                    var volParts = $scope.volumes.split(" ");
                    if (volParts != "") {
                        for (var i=0; i<volParts.length; i++) {
                            volumes.push(volParts[i]);
                        }
                    }
                }
                // ports
                var ports = [];
                $(".ui.segment.ports").children("div.four.fields").each(function(i, el){
                    var portSpecs = $(el).children("div").children("div");
                    var portDef = {};
                    var proto = $(portSpecs[0]).children(":input")[0].value;
                    var ip = $(portSpecs[1]).children(":input")[0].value;
                    var port = $(portSpecs[2]).children(":input")[0].value;
                    var container_port = $(portSpecs[3]).children(":input")[0].value;
                    portDef["proto"] = proto;
                    portDef["host_ip"] = ip || null;
                    portDef["port"] = parseInt(port);
                    portDef["container_port"] = parseInt(container_port) || null;
                    ports.push(portDef);
                    if (portDef["proto"] == "" || portDef["container_port"] == null) {
                        $(portSpecs[0]).addClass("error");
                        $(portSpecs[3]).addClass("error");
                        $scope.error = "you must specify a protocol and container port for port bindings";
                        $scope.hideLoader();
                        valid = false;
                        return false;
                    }
                });
                var restartPolicy = {
                    name: $scope.selectedRestartPolicy,
                }
                var maxRestarts = parseInt($scope.maxRestarts);
                if(maxRestarts > 0) {
                    restartPolicy.maximum_retry = maxRestarts;
                }
                var params = {
                    name: $scope.name,
                    container_name: $scope.containerName,
                    cpus: parseFloat($scope.cpus),
                    memory: parseFloat($scope.memory),
                    environment: environment,
                    hostname: $scope.hostname,
                    domain: $scope.domain,
                    type: $scope.selectedType,
                    network_mode: networkMode,
                    args: args,
                    links: links,
                    volumes: volumes,
                    bind_ports: ports,
                    labels: selectedLabels,
                    publish: $scope.publish,
                    restart_policy: restartPolicy, 
                };
                if (valid) {
                    Container.save({count: $scope.count, pull: $scope.pull}, params).$promise.then(
                        function(c){$location.path("/containers");}, 
                        function(err){
                        $scope.hideLoader();
                        $scope.error = err.data;
                        return false;
                    });
                }
            };
        })
        .controller('ContainerDetailsController', function($scope, $location, $routeParams, flash, Container) {
            $scope.template = 'templates/container_details.html';
            $scope.showX = function(){
                return function(d){
                    return d.key;
                };
            };
            $scope.showRemoveContainerDialog = function() {
                $('.basic.modal.removeContainer')
                    .modal('show');
            };
            $scope.showStopContainerDialog = function() {
                $('.basic.modal.stopContainer')
                    .modal('show');
            };
            $scope.showRestartContainerDialog = function() {
                $('.basic.modal.restartContainer')
                    .modal('show');
            };
            $scope.showScaleContainerDialog = function() {
                $('.basic.modal.scaleContainer')
                    .modal('show');
            };
            $scope.destroyContainer = function() {
                Container.destroy({id: $routeParams.id}).$promise.then(function() {
                    // we must remove the modal or it will come back
                    // the next time the modal is shown
                    $('.basic.modal').remove();
                    $location.path("/containers");
                }, function(err) {
                    flash.error = 'error destroying container: ' + err.data;
                });
            };
            $scope.stopContainer = function() {
                Container.control({id: $routeParams.id, action: 'stop'}).$promise.then(function() {
                    // we must remove the modal or it will come back
                    // the next time the modal is shown
                    $('.basic.modal').remove();
                    $location.path("/containers/");
                }, function(err) {
                    flash.error = 'error stopping container: ' + err.data;
                });
            };
            $scope.restartContainer = function() {
                Container.control({id: $routeParams.id, action: 'restart'}).$promise.then(function() {
                    // we must remove the modal or it will come back
                    // the next time the modal is shown
                    $('.basic.modal').remove();
                    $location.path("/containers/");
                }, function(err) {
                    flash.error = 'error restarting container: ' + err.data;
                });
            };
            $scope.showProgress = function() {
                $('.ui.form').addClass('hide');
                $('.progress').removeClass('hide');
            };
            $scope.hideProgress = function() {
                $('.ui.form').removeClass('hide');
                $('.progress').addClass('hide');
            };
            $scope.scale = function() {
                var valid = $(".ui.form").form('validate form');
                if (!valid) {
                    return false;
                }
                $scope.showProgress();
                Container.control({id: $routeParams.id, action: 'scale', count: $scope.count}).$promise.then(function() {
                    // we must remove the modal or it will come back
                    // the next time the modal is shown
                    $('.basic.modal').modal('hide');
                    $('.basic.modal').remove();
                    $location.path("/containers");
                }, function(err) {
                    flash.error = 'error scaling container: ' + err.data;
                    $scope.hideProgress();
                    $('.basic.modal').modal('hide');
                    $('.basic.modal').remove();
                });
            };
            var portLinks = [];
            Container.query({id: $routeParams.id}, function(data){
                $scope.container = data;
                // build port links
                $scope.tooltipFunction = function(){
                    return function(key, x, y, e, graph) {
                        return "<div class='ui block small header'>Reserved</div>" + '<p>' + y + '</p>';
                    }
                };
                angular.forEach(data.ports, function(p) {
                    var h = document.createElement('a');
                    h.href = data.engine.addr;
                    var l = {};
                    l.hostname = h.hostname;
                    l.protocol = p.proto;
                    l.port = p.port;
                    l.container_port = p.container_port;
                    l.link = h.protocol + '//' + h.hostname + ':' + p.port;
                    this.push(l);
                }, portLinks);
                $scope.portLinks = portLinks;
                $scope.predicate = 'container_port';
                $scope.cpuMax = data.engine.cpus;
                $scope.memoryMax = data.engine.memory;
                $scope.chartOptions = {};
                $scope.containerCpuData = {
                    labels: ["Reserved"],
                    datasets: [
                        {
                            fillColor: "#6D91AD",
                            data: [ $scope.container.image.cpus ]
                        }
                    ]
                };
                $scope.containerMemoryData = {
                    labels: ["Reserved"],
                    datasets: [
                        {
                            fillColor: "#6D91AD",
                            data: [ $scope.container.image.memory ]
                        }
                    ]
                };
            });
        })
        .controller('ContainerLogsController', function($scope, $location, $routeParams, $http, flash, Container, ansi2html) {
            $scope.template = 'templates/container_logs.html';

            $http.get('/api/containers/' + $routeParams.id + "/logs").success(function(data){
                $scope.logs = ansi2html.toHtml(data.replace(/\n/g, '<br/>'));
            });
            Container.query({id: $routeParams.id}, function(data){
                $scope.container = data;
            });
        })
        .controller('EnginesController', function($scope, $location, Engines) {
            $scope.orderByField = 'engine.id';
            $scope.reverseSort = false;

            $scope.go = function() {
                $location.path("/engines/" + this.e.id)
            };

            $scope.selectSortColumn = function(field) {
                $scope.reverseSort = !$scope.reverseSort;
                $scope.orderByField = field;
            }

            $scope.sortedTableHeading = function(field) {
                if($scope.orderByField != field) {
                    return "";
                } else {
                    if($scope.reverseSort == true) {
                        return "descending";
                    } else {
                        return "ascending";
                    }
                }
            }
            
            $scope.template = 'templates/engines.html';
            Engines.query(function(data){
                $scope.engines = data;
            });
        })
        .controller('EngineAddController', function($scope, $location, $routeParams, flash, Engines) {
            $scope.template = 'templates/engine_add.html';
            $scope.id = "";
            $scope.addr = "";
            $scope.cpus = 1.0;
            $scope.memory = 1024;
            $scope.labels = "";
            $scope.ssl_cert = "";
            $scope.ssl_key = "";
            $scope.ca_cert = "";
            $scope.addEngine = function() {
                var valid = $(".ui.form").form('validate form');
                if (!valid) {
                    return false;
                }
                var params = {
                    engine: {
                        id: $scope.id,
                        addr: $scope.addr,
                        cpus: parseFloat($scope.cpus),
                        memory: parseFloat($scope.memory),
                        labels: $scope.labels.split(" ")
                    },
                    ssl_cert: $scope.ssl_cert,
                    ssl_key: $scope.ssl_key,
                    ca_cert: $scope.ca_cert
                };
                Engines.save({}, params).$promise.then(function(c){
                    $location.path("/engines");
                }, function(err){
                    $scope.error = err.data;
                    return false;
                });
            };
        })
        .controller('EngineDetailsController', function($scope, $location, $routeParams, flash, Containers, Engine) {
            $scope.template = 'templates/engine_details.html';
            $scope.showX = function(){
                return function(d){
                    return d.key;
                };
            };
            $scope.showY = function(){
                return function(d){
                    return d.y;
                };
            };
            $scope.showRemoveEngineDialog = function() {
                $('.basic.modal')
                    .modal('show');
            };
            $scope.removeEngine = function() {
                Engine.remove({id: $routeParams.id}).$promise.then(function() {
                    // we must remove the modal or it will come back
                    // the next time the modal is shown
                    $('.basic.modal').remove();
                    $location.path("/engines");
                }, function(err) {
                    flash.error = 'error removing engine: ' + err.data;
                });
            };
            Engine.query({id: $routeParams.id}, function(data){
                $scope.engine = data;
                // load container data
                Containers.query(function(d){
                    var cpuData = [];
                    var memoryData = [];
                    $scope.chartOptions = {};
                    for (var i=0; i<d.length; i++) {
                        var c = d[i];
                        var color = getRandomColor();
                        if (c.engine.id == data.engine.id){
                            var x = {
                                label: c.image.hostname,
                                value: c.image.cpus || 0.0,
                                color: color
                            }
                            var y = {
                                label: c.image.hostname,
                                value: c.image.memory || 0.0,
                                color: color
                            }
                            cpuData.push(x);
                            memoryData.push(y);
                        } 
                    }
                    $scope.engineCpuData = cpuData;
                    $scope.engineMemoryData = memoryData;
                });
            });
        })
        .controller('EventsController', function($scope, $location, $window, Events) {
            $scope.template = 'templates/events.html';
            $scope.orderByField = 'time';
            $scope.reverseSort = true;
            $scope.selectSortColumn = function(field) {
                $scope.reverseSort = !$scope.reverseSort;
                $scope.orderByField = field;
            }
            $scope.sortedTableHeading = function(field) {
                if($scope.orderByField != field) {
                    return "";
                } else {
                    if($scope.reverseSort == true) {
                        return "descending";
                    } else {
                        return "ascending";
                    }
                }
            }

            $scope.showPurgeEventsDialog = function() {
                $('.basic.modal.purgeEvents')
                    .modal('show');
            };
            $scope.purgeEvents = function() {
                Events.purge().$promise.then(function(c) {
                    // we must remove the modal or it will come back
                    // the next time the modal is shown
                    $('.basic.modal').remove();
                    $location.path('/events');
                    $window.location.reload();
                }, function(err) {
                    flash.error = 'error purging events: ' + err.data;
                });
            };
            Events.query(function(data){
                $scope.events = data;
            });
        })

        .controller('ApplicationsController' , function($scope,$location,Applications){
            console.log(arguments);
            $scope.orderByField = 'id';
            $scope.reverseSort = false;

            $scope.go = function() {
                $location.path("/applications/" + this.c.id)
            }

            $scope.selectSortColumn1 = function(field) {
                $scope.reverseSort = !$scope.reverseSort;
                $scope.orderByField = field;
            }

            $scope.sortedTableHeading1 = function(field) {
                if($scope.orderByField != field) {
                    return "";
                } else {
                    if($scope.reverseSort == true) {
                        return "descending";
                    } else {
                        return "ascending";
                    }
                }
            }

            $scope.uploadYML = function(){
                var file = $scope.myFile;
                console.log(file);
                Applications.save({}, file).$promise.then(function(c){
                    $location.path("/applications/");
                }, function(err){
                    $scope.error = err.data;
                    return false;
                });

            }

            $scope.template = 'templates/applications.html';
            Applications.query(function(data){
                // data = [{"id":"9ee44bc988eebf2f7c12a585b3ae7542a76f6bb1a4aa6f511693d0db26678292","name":"/dd","image":{"name":"dd3d3d029bb2","cpus":0.1,"memory":256,"environment":{"VERSION":"2.25"},"hostname":"dd","domain":"dd","type":"service","labels":[""],"volumes":["dd"],"restart_policy":{"name":"no"},"network_mode":"bridge"},"engine":{"id":"shipyard","addr":"http:\\172.16.12.32:2375","cpus":1,"memory":1024,"labels":["yj"]},"state":"stopped"},{"id":"f98946c848cd2fc4700e5432fd8b73db8a23d92070dda186b70493f84dfe65c0","name":"/shipyard-rethinkdb","image":{"name":"dreg:5000/funvalley_dockerhub_mirror/shipyard_rethinkdb:latest","entrypoint":["/usr/bin/rethinkdb"],"hostname":"f98946c848cd","bind_ports":[{"proto":"tcp","host_ip":"0.0.0.0","port":28015,"container_port":28015},{"proto":"tcp","host_ip":"0.0.0.0","port":49171,"container_port":29015},{"proto":"tcp","host_ip":"0.0.0.0","port":49172,"container_port":8080}],"volumes":["/data"],"restart_policy":{},"publish":true,"network_mode":"bridge"},"engine":{"id":"shipyard","addr":"http://172.16.12.32:2375","cpus":1,"memory":1024,"labels":["yj"]},"state":"running","ports":[{"proto":"tcp","host_ip":"0.0.0.0","port":28015,"container_port":28015},{"proto":"tcp","host_ip":"0.0.0.0","port":49171,"container_port":29015},{"proto":"tcp","host_ip":"0.0.0.0","port":49172,"container_port":8080}]},{"id":"861aabddeb9077bbb73c07c71c563ff576657a45372116722b455685c9559eab","name":"/shipyard-rethinkdb-data","image":{"name":"dreg:5000/funvalley_dockerhub_mirror/shipyard_rethinkdb:latest","entrypoint":["/bin/bash"],"hostname":"861aabddeb90","volumes":["/data"],"restart_policy":{},"network_mode":"bridge"},"engine":{"id":"shipyard","addr":"http://172.16.12.32:2375","cpus":1,"memory":1024,"labels":["yj"]},"state":"running"}] ;
                $scope.applications = data;
            });
        })

        .controller('ApplicationDetailsController', function($scope, $location, $routeParams, flash, Application) {
             $scope.template = 'templates/application_details.html';
            $scope.showX = function(){
                return function(d){
                    return d.key;
                };
            };
            $scope.showRemoveApplicationDialog = function() {
                $('.basic.modal.removeApplication')
                    .modal('show');
            };
            $scope.showStopApplicationDialog = function() {
                $('.basic.modal.stopApplication')
                    .modal('show');
            };
            $scope.showStartApplicationDialog = function() {
                $('.basic.modal.startApplication')
                    .modal('show');
            };
          
            $scope.removeApplication = function() {
                Application.remove({id: $routeParams.id}).$promise.then(function() {
                 
                    $('.basic.modal').remove();
                    $location.path("/applications");
                }, function(err) {
                    flash.error = 'error removing application: ' + err.data;
                });
            };
            $scope.stopApplication = function() {
                Application.control({id: $routeParams.id, action: 'stop'}).$promise.then(function() {
                
                    $('.basic.modal').remove();
                    $location.path("/applications/");
                }, function(err) {
                    flash.error = 'error stopping application: ' + err.data;
                });
            };
            $scope.startApplication = function() {
                Application.control({id: $routeParams.id, action: 'restart'}).$promise.then(function() {
                
                    $('.basic.modal').remove();
                    $location.path("/applications/");
                }, function(err) {
                    flash.error = 'error restarting application: ' + err.data;
                });
            };
            $scope.showProgress = function() {
                $('.ui.form').addClass('hide');
                $('.progress').removeClass('hide');
            };
            $scope.hideProgress = function() {
                $('.ui.form').removeClass('hide');
                $('.progress').addClass('hide');
            };
        

             Application.query({id: $routeParams.id}, function(data){
                // data = {"id":"17716b5f-a04c-4832-ba2d-5ac68feeac75","name":"17716b_name","description":"17716b_description","config":{"Name":"17716b_config_Name","Containers":{"memcached":{"Image":"tutum/memcached","Build":"17716b_build","Command":"17716b_command","Entrypoint":"17716b_entrypoint","Environment":"17716b_environment","Ports":["11211:11212"],"Volumes":"17716b_volumes","Links":"17716b_links","User":"17716b_user","WorkingDir":"17716b_workingDir","Tty":"17716b_tty","Memory":"17716b_memory","CpuShares":"17716b_cpuShares","Cpuset":"17716b_cpuset","Privileged":"17716b_privileged","CapAdd":"17716b_capAdd","CapDrop":"17716b_capDrop","Devices":"17716b_devices"},"mongo":{"Image":"funbell/mongo","Build":"","Command":" ","Entrypoint":" ","Environment":" ","Ports":["27017:27017"],"Volumes":["/var/dproject/mongodb:/data/db"],"Links":"","User":"","WorkingDir":"","Tty":"","Memory":"","CpuShares":0,"Cpuset":"","Privileged":"","CapAdd":"","CapDrop":"","Devices":""},"tomcat":{"Image":"mytomcat:0.02","Build":"","Command":" ","Entrypoint":" ","Environment":" ","Ports":["9099:9099"],"Volumes":" ","Links":["mongo","memcached"],"User":"","WorkingDir":"","Tty":false,"Memory":"","CpuShares":0,"Cpuset":"","Privileged":false,"CapAdd":" ","CapDrop":" ","Devices":" "}}}}
                $scope.application = data;
                $scope.appContainer = data.config.Containers;
               
            });

        })

$(function(){
    $('.message .close').on('click', function() {
          $(this).closest('.message').fadeOut();
    });
});
