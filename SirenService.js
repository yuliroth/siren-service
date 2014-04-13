/**
 * Created by Dark Ink LLC on 4/3/14.
 */

var sirenModule = angular.module('siren', []);

sirenModule.service('SirenService', ["$http", "$q", function($http, $q) {

  this.configureMethods = function(rawResonse) {
    var self = this;

    Object.defineProperty(rawResonse, "hasClass", {
      enumerable: false,
      value:  function(className) {
        return rawResonse.class.indexOf(className) > -1;
      }
    });

    Object.defineProperty(rawResonse, "findEntitiesByClass", {
      enumerable: false,
      value: function(className) {
        var result = [];
        for (var i = 0; i < rawResonse.entities.length; i++) {
          if (rawResonse.entities[i].class.indexOf(className) > -1) {
            result.push(rawResonse.entities[i]);
          }
        }
        if (result.length > 0) { return result; }
        return false;
      }
    });

    Object.defineProperty(rawResonse, "findEntitiesByRel",
      {
        enumerable: false,
        value: function (relName) {
          var result = [];
          for (var i = 0; i < rawResonse.entities.length; i++) {
            if (rawResonse.entities[i].rel.indexOf(relName) > -1) {
              result.push(rawResonse.entities[i]);
            }
          }
          if (result.length > 0) { return result; }
          return false;
        }
      });

    Object.defineProperty(rawResonse, "findAction", {
      enumerable: false,
      value: function(actionName) {
        for(var i = 0; i < rawResonse.actions.length; i++) {
          if (rawResonse.actions[i].name === actionName) return rawResonse.actions[i];
        }
      }
    });

    Object.defineProperty(rawResonse, 'invoke', {
      enumerable: false,
      value: function(actionName) {
        var action = rawResonse.findAction(actionName);
        if (action) {
          var defered = $q.defer();
          var data = null;
          if (arguments.length >= 2) {
            if (angular.isObject(arguments[1])) {
              data = arguments[1];
            } else {
              /* TODO: throw exception if more arguments than fields */
              data = {};
              for (var argIdx = 1; argIdx < arguments.length; argIdx++) {
                data[action.fields[argIdx - 1].name] = arguments[argIdx];
              }
            }
          }

          if (action.method === 'POST') {
            $http.post(action.href, data).success(function (data, status) {
              self.configureMethods(data);
              defered.resolve({data: data, status: status});
            }).error(function (data, status) {
              defered.reject({data: data, status: status});
            });
          } else if(action.method === 'GET') {
            $http.get(action.href, data).success(function (data, status) {
              self.configureMethods(data);
              defered.resolve({data: data, status: status});
            }).error(function (data, status) {
              defered.reject({data: data, status: status});
            });
          } else if(action.method === 'PUT') {
            $http.put(action.href, data).success(function (data, status) {
              self.configureMethods(data);
              defered.resolve({data: data, status: status});
            }).error(function (data, status) {
              defered.reject({data: data, status: status});
            });
          } else if(action.method === 'DELETE') {
            $http.delete(action.href, data).success(function (data, status) {
              defered.resolve({data: data, status: status});
            }).error(function (data, status) {
              defered.reject({data: data, status: status});
            });
          }

          return defered.promise;
        }
      }
    });

    Object.defineProperty(rawResonse, "linkNames", {
      enumerable: false,
      value: function() {
        var result = [];
        for (var i = 0; i < rawResonse.links.length; i++) {
          result.push(rawResonse.links[i].rel);
        }
        return result;
      }
    });

    Object.defineProperty(rawResonse, "findLinkByRel", {
      enumerable: false,
      value: function(linkRel) {
        for(var i = 0; i < rawResonse.links.length; i++) {
          if (rawResonse.links[i].rel === linkRel) return rawResonse.links[i];
        }
      }
    });

    Object.defineProperty(rawResonse, "getLinked", {
      enumerable: false,
      value: function(linkRel) {
        var relatedLink = rawResonse.findLinkByRel(linkRel);
        if (relatedLink) {
          var defered = $q.defer();
          $http.get(relatedLink.href).success(function(response) {
            defered.resolve(response);
          }).error(function(data, status) {
            defered.reject(status);
          })

          return defered.promise;
        }
      }
    });

    if (rawResonse.entities) {
      for (var i = 0; i < rawResonse.entities.length; i++) {
        var anEntity = rawResonse.entities[i];
        Object.defineProperty(anEntity, "findLinkByRel", {
          enumerable: false,
          value: function(linkRel) {
            for (var j = 0; j < anEntity.links.length; j++) {
              if (anEntity.links[j].rel === linkRel) return anEntity.links[j];
            }
          }
        })
      }
    }

    return rawResonse;
  };

  this.get = function(uri) {
    var defered = $q.defer();
    var self = this;

    $http.get(uri).success(function(result) {
      defered.resolve(self.configureMethods(result));
    });

    return defered.promise;
  }
}]);
