/**
 * Created by phoehne on 4/2/14.
 */

describe("SirenService", function() {
  var sirenService;
  var httpBackend;

  var resources = [
    {
      class: ['resource'],
      rel: ['child'],
      properties: { foo: 'bar', bar: 'baz' },
      links: [
        {rel: 'self', href: '/api/v1/resources/1234'}
      ]
    }, {
      class: ['resource'],
      rel: ['child'],
      properties: { foo: 'ba2r', bar: 'baz2' },
      links: [
        {rel: 'self', href: '/api/v1/resources/1235'}
      ]
    }, {
      class: ['parent'],
      rel: ['parentObject'],
      properties: { qux: "quux" },
      href: '/api/v1/parent/1234',
      links: [{rel: 'self', href: '/api/v1/parents/1234'}]
    }
  ];

  var resourceList = {
    class: ["resource", "list"],
    entities: resources,
    links: [
      {rel: 'related', href: '/api/v1/related' }
    ],
    actions: [
      {
        name: 'add-resource',
        method: 'POST',
        href: '/api/v1/resources',
        fields: [{name: 'foo', type: 'text'}, {name: 'bar', type: 'text'}]
      }
    ]
  };

  var newResource = {
    class: ['resource'],
    properties: { foo: 'a', bar: 'b'},
    links: [ { rel: 'self', href: '/api/v1/resources/2345' } ],
    actions: [
      {
        name: 'delete-resource',
        method: 'DELETE',
        href: '/api/v1/resources/2345'
      },
      {
        name: 'update-resource',
        method: 'PUT',
        href: '/api/v1/resources/2345',
        fields: [{name: 'foo', type: 'text'}, {name: 'bar', type: 'text'}]
      }
    ]
  }

  var relatedResource = {
    class: ['related'],
    properties: {
      name: 'Big Daddy'
    },
    links: [
      {rel: 'self', href: '/api/v1/related' }
    ]
  };



  beforeEach(function() {
    module("app");
  });

  beforeEach(inject(function(SirenService, $httpBackend) {
    sirenService = SirenService;
    httpBackend = $httpBackend;
  }));

  describe("Get a List of Resources", function() {
    it("should return a a list of resources", function() {
      sirenService.get('/api/v1/resources').then(function(response) {
        expect(response.hasClass("list")).toBe(true);
      });

      httpBackend.expectGET('/api/v1/resources').respond(200, resourceList);
      httpBackend.flush();
    });
  });

  describe("Basic entity methods", function() {
    var resources;

    beforeEach(function() {
      sirenService.get('/api/v1/resources').then(function(response) {
        resources = response;
      });

      httpBackend.expectGET('/api/v1/resources').respond(200, resourceList);
      httpBackend.flush();
    });

    it("should return two related entities", function() {
      expect(resources.entities.length).toBe(3);
    });

    it("should return entities with a given class", function() {
      expect(resources.findEntitiesByClass('resource').length).toBe(2);
      expect(resources.findEntitiesByClass('parent').length).toBe(1);
    });

    it("should return entities with a given relationship", function() {
      expect(resources.findEntitiesByRel('child').length).toBe(2);
    });

    it("should find actions by name", function() {
      expect(resources.findAction('delete')).toBeUndefined();
      expect(resources.findAction('add-resource')).toBeDefined();
    });

    it("should find related links", function() {
      expect(resources.findLinkByRel('related')).toBeDefined();
      expect(resources.findLinkByRel('related').rel).toBe('related');
      expect(resources.findLinkByRel('related').href).toBe('/api/v1/related')
    });

    it("should return a list of link names", function() {
      expect(resources.linkNames()).toBeDefined();
      expect(resources.linkNames().length).toBe(1);
      expect(resources.linkNames()[0]).toBe('related');
    });

    it("should find links on related entities", function() {
      var parentResouce = resources.findEntitiesByClass("parent")[0];
      expect(parentResouce.findLinkByRel("self").href).toBe("/api/v1/parents/1234");
    })
  });

  describe("Link navigation", function() {
    var resources;

    beforeEach(function() {
      sirenService.get('/api/v1/resources').then(function(response) {
        resources = response;
      });

      httpBackend.expectGET('/api/v1/resources').respond(200, resourceList);
      httpBackend.flush();
    });

    it("should navigate to related links", function() {
      httpBackend.expectGET(resources.findLinkByRel('related').href).respond(200, relatedResource);

      resources.getLinked("related").then(function(value) {
        expect(value.class[0]).toBe("related");
      });
      httpBackend.flush();
    });

    it("should handle a bad response", function() {
      httpBackend.expectGET(resources.findLinkByRel('related').href).respond(404);

      resources.getLinked("related").then(function(value) { expect(value).toBeUndefined() },
        function(value) {
          expect(value).toBe(404)
        });
      httpBackend.flush();
    });

    it("should return an undefined if there's no such link", function() {
      expect(resources.getLinked('foo')).toBeUndefined();
    });
  });

  describe("Action Invocation", function() {
    var resources;

    beforeEach(function() {
      sirenService.get('/api/v1/resources').then(function(response) {
        resources = response;
      });

      httpBackend.expectGET('/api/v1/resources').respond(200, resourceList);
      httpBackend.flush();
    });

    it("should invoke an action, passing paramters as function parameters", function() {
      httpBackend.expectPOST('/api/v1/resources', {foo: 'a', bar: 'b'}).respond(201, newResource);

      resources.invoke('add-resource', "a", "b").then(function(response) {
        expect(response.status).toBe(201);
        expect(response.data.class[0]).toBe('resource');
      });

      httpBackend.flush();
    });

    it("should invoke an action, passing parameters as an object", function() {
      httpBackend.expectPOST('/api/v1/resources', {foo: 'a', bar: 'b'}).respond(201, newResource);

      resources.invoke('add-resource', { foo: 'a', bar: 'b'}).then(function(response) {
        expect(response.status).toBe(201);
        expect(response.data.class[0]).toBe('resource');
      });

      httpBackend.flush();
    });

    it("should fail when the response is not a 2xx", function() {
      httpBackend.expectPOST('/api/v1/resources', { foo: 'a', bar: 'b'}).respond(404, "failed");

      resources.invoke('add-resource', { foo: 'a', bar: 'b' }).then(function(response) {
        expect(false).toBe(true);
      }, function(response) {
        expect(response.status).toBe(404);
      });

      httpBackend.flush();
    });

    it("should use the appropriate method", function() {
      var singleResource = null;

      sirenService.get('/api/v1/resources/2345').then(function(response) {
        singleResource = response;
      });

      httpBackend.expectGET('/api/v1/resources/2345').respond(200, newResource);
      httpBackend.flush();

      singleResource.invoke('delete-resource').then(function(response) {
        expect(response.status).toBe(204);
      });

      httpBackend.expectDELETE('/api/v1/resources/2345').respond(204);
      httpBackend.flush();
    });
  });

  describe("Returned Objects", function() {
    var resources;

    beforeEach(function() {
      sirenService.get('/api/v1/resources').then(function(response) {
        resources = response;
      });

      httpBackend.expectGET('/api/v1/resources').respond(200, resourceList);
      httpBackend.flush();
    });

    it("should annotate returned objects with appropriate methods", function() {

      httpBackend.expectPOST('/api/v1/resources').respond(201, newResource);
      httpBackend.expectDELETE('/api/v1/resources/2345').respond(204);

      resources.invoke('add-resource', { foo: 'a', bar: 'b'}).then(function(response) {
        response.data.invoke('delete-resource').then(function(subResponse) {
          expect(subResponse.status).toBe(204);
        });
      });

      httpBackend.flush();
    });
  });
});