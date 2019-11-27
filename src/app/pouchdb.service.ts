import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';

@Injectable({
  providedIn: 'root'
})
/**
 * The PouchdbService handles the complete interaction of the web application with the PouchDB or CouchDB.
 * The specific database can be set in the constructor of the class
 * 
 * @author Sebastian Gottschalk
 */
export class PouchdbService {
  db: PouchDB.Database;

  // Use "http://localhost:4200/database" for connecting to a CouchDB specified in the proxy.conf.json
  databaseName = "bmdl-feature-modeler" 

  /**
   * Create a new instance of the PouchdbService.
   */
  constructor() {

    // Create a PouchDB connection
    PouchDB.plugin(PouchDBFind)
    // Change to this.db = new PouchDB('http://server:port/yourdatabase'); to connect to a couchdb database
    this.db = new PouchDB(this.databaseName); 

    // Check database connection
    this.db.info().then(function (info) {
      console.log("Database connection: " + JSON.stringify(info));
    })
  }

  getDatabaseInfo() {
    return this.db.info();
  }

  /**
   * Get the list of the feature models.
   */
  getFeatureModelList() {
    return this.db.find({
      selector: {},
      fields: ['_id', 'name', 'description']
    });
    
    //return this.db.query(function (doc: any, emit) {
    //  emit(doc._id, { name: doc.name, description: doc.description })
    //}, {});
  }

  /**
   * Get the current feature model.
   * @param featureModelId id of the current feature model
   */
  getFeatureModel(featureModelId: string) {
    return this.db.get(featureModelId)
  }

  /**
   * Add a new feature model.
   * @param name name of the feature model
   * @param description description of the feature model
   */
  addFeatureModel(name: string, description: string) {
    var defaultFeatureModel = {
      name: name,
      description: description,
      featureIdCounter: 10,
      businessModelIdCounter: 1,
      features: [
        this.createFeatureByParameter(1, "Value Proposition"),
        this.createFeatureByParameter(2, "Customer Segment"),
        this.createFeatureByParameter(3, "Customer Relationships"),
        this.createFeatureByParameter(4, "Customer Channels"),
        this.createFeatureByParameter(5, "Key Partners"),
        this.createFeatureByParameter(6, "Key Activities"),
        this.createFeatureByParameter(7, "Key Resources"),
        this.createFeatureByParameter(8, "Revenue Streams"),
        this.createFeatureByParameter(9, "Cost Structure")
      ],
      featureMap: {
        "1": "Value Proposition",
        "2": "Customer Segments",
        "3": "Customer Relationships",
        "4": "Customer Channel",
        "5": "Key Partners",
        "6": "Key Activities",
        "7": "Key Resources",
        "8": "Revenue Streams",
        "9": "Cost Structure"
      },
      businessModelMap: {}
    }
    return this.db.post(defaultFeatureModel);
  }

  /**
   * Remove the current feature model.
   * @param id id of the current feature model
   */
  deleteFeatureModel(id: string) {
    return this.db.get(id).then(result => {
      return this.db.remove(result);
    })
  }

  /**
   * Update name and description of the current feature model.
   * @param id id of the current feature model
   * @param name name of the current feature model
   * @param description description of the current feature model
   */
  updateFeatureModel(id: string, name: string, description: string) {
    return this.db.get(id).then(result => {
      result['name'] = name;
      result['description'] = description;
      return this.db.put(result);
    });
  }

  /**
   * Add a business model decision to the business model.
   * @param featureModelId id of the current feature model
   * @param featureId id of the feature to add
   * @param businessModelId id of the business model
   */
  addBusinessDecision(featureModelId: string, featureId: number, businessModelId: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      // Generic function to update feature
      var updateBusinessDecisionInline = (result: any): any => {
        var result = result;
        result['businessModelIds'].push(parseInt(businessModelId.toString()));
        return result;
      };

      // Update feature model
      result = this.updateFeatureHandler(result, featureId, updateBusinessDecisionInline);

      return this.db.put(result);

    });

  }

  /**
   * Remove a business model decision from the business model.
   * @param featureModelId id of the current feature model
   * @param featureId id of the feature to remove
   * @param businessModelId id of the busienss model
   */
  removeBusinessDecision(featureModelId: string, featureId: number, businessModelId: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      var parentResult = this.getFeatureWithParentFromModel(result, featureId.toString());
      var featureIdList = this.listSubfeatureIdsHelper(parentResult.features)
      featureIdList.push(featureId);

      // Generic function to update feature
      var updateBusinessDecisionInline = (businessModelId: number, result: any): any => {
        var result = result;
        result['businessModelIds'] = result['businessModelIds'].filter(function (e) { return e !== parseInt(businessModelId.toString()) })
        return result;
      };

      // Update other features
      for (var i = 0; i < featureIdList.length; i++) {
        result = this.updateFeatureHandler(result, featureIdList[i], updateBusinessDecisionInline.bind(null, businessModelId));

      }

      return this.db.put(result);
    })
  }


  /**
   * Add a new business model to the current feature model id.
   * @param featureModelId id for the current feature model
   * @param name name of the business model
   */
  addBusinessModel(featureModelId: string, name: string) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      for (var i = 0; i < result['features'].length; i++) {
        result['features'][i]['businessModelIds'].push(result['businessModelIdCounter']);
      }

      result['businessModelMap'][result['businessModelIdCounter']] = name;
      result['businessModelIdCounter'] = result['businessModelIdCounter'] + 1;

      return this.db.put(result);
    });
  }

  /**
   * Update the name of the business model.
   * @param featureModelId id of the current feature model
   * @param businessModelId id of the business model
   * @param name new name of the business model
   */
  updateBusinessModel(featureModelId: string, businessModelId: number, name: string) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      result['businessModelMap'][businessModelId] = name;

      return this.db.put(result);
    });
  }

  /**
   * Adapt an existing business model.
   * @param featureModelId id of the current feature model
   * @param businessModelId id of the business model
   * @param adaptationName name of the adapted business model
   */
  adaptBusinessModel(featureModelId: string, businessModelId: string, adaptationName: string){
    return this.db.get(featureModelId).then(result => {
      var result = result;
      var newBusinessModelId = result['businessModelIdCounter'];

      // Create new business model
      for (var i = 0; i < result['features'].length; i++) {
        result['features'][i]['businessModelIds'].push(result['businessModelIdCounter']);
      }

      result['businessModelMap'][result['businessModelIdCounter']] = adaptationName;
      result['businessModelIdCounter'] = result['businessModelIdCounter'] + 1;
      
      // Traverse features
      var featureStack: any[] = []

      for (var i = 0; i < result['features'].length; i++) {
        var model = result['features'][result['features'].length - 1 - i];
        featureStack.push(model);
      }

      // Select single feature from the stack
      while (featureStack.length > 0) {
        var f = featureStack.pop();
        if(f['businessModelIds'].includes(parseInt(businessModelId)) && !f['businessModelIds'].includes(parseInt(newBusinessModelId))) {
          f['businessModelIds'].push(newBusinessModelId)
        } 

        // Add new features to the stack
        if (f.features) {
          for (var i = 0; i < f.features.length; i++) {
            var model = f.features[f.features.length - 1 - i];
            featureStack.push(model);
          }
        }
      }
      //console.log(JSON.stringify(result));
      //return result;
      return this.db.put(result);
    });
  }

  /**
   * Delete a specific business model of the current feature model.
   * @param featureModelId id of the current feature model
   * @param businessModelId id of the business model
   */
  deleteBusinessModel(featureModelId: string, businessModelId: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      var featureStack: any[] = []

      for (var i = 0; i < result['features'].length; i++) {
        var model = result['features'][result['features'].length - 1 - i];
        featureStack.push(model);
      }

      // Select single feature from the stack
      while (featureStack.length > 0) {
        var f = featureStack.pop();

        f['businessModelIds'] = f['businessModelIds'].filter(function (e) { return e !== parseInt(businessModelId.toString()) })

        // Add new features to the stack
        if (f.features) {
          for (var i = 0; i < f.features.length; i++) {
            var model = f.features[f.features.length - 1 - i];
            featureStack.push(model);
          }
        }
      }
      delete result['businessModelMap'][businessModelId]

      return this.db.put(result);
    });
  }


  /**
   * Add a dependency to the current feature model.
  * @param featureModelId id of the current feature model
   * @param dependencyType type of the dependency
   * @param fromFeatureId id of the first feature
   * @param toFeatureId id of the second feature
   */
  addDependency(featureModelId: string, dependencyType: string, fromFeatureId: number, toFeatureId: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      // Generic function to insert dependencies
      var insertDependency = (array: string, featureDepedencyId: number, result: any): any => {
        var result = result;
        result[array].push(parseInt(featureDepedencyId.toString()));
        return result;
      }
      result = this.dependencyModificationHelper(result, dependencyType, fromFeatureId, toFeatureId, insertDependency);

      return this.db.put(result);

    })
  }

  /**
   * Delete a dependency from the current feature model.
   * @param featureModelId id of the current feature model
   * @param dependencyType type of the dependency
   * @param fromFeatureId id of the first feature
   * @param toFeatureId id of the second feature
   */
  deleteDependency(featureModelId: string, dependencyType: string, fromFeatureId: number, toFeatureId: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      // Generic function to delete dependencies
      var deleteDependency = (array: string, featureDepedencyId: number, result: any): any => {
        var result = result;
        result[array] = result[array].filter(function (e) { return e !== featureDepedencyId })
        return result;
      }
      result = this.dependencyModificationHelper(result, dependencyType, fromFeatureId, toFeatureId, deleteDependency);

      return this.db.put(result);

    });
  }

  /**
   * Helper function to modify the dependencies of the current feature model.
   * @param featureModel current feature model
   * @param dependencyType type of the dependency
   * @param fromFeatureId id of the first feature
   * @param toFeatureId id of the second feature
   * @param modificationFunction modification function
   */
  private dependencyModificationHelper(featureModel: any, dependencyType: string, fromFeatureId: number, toFeatureId: number, modificationFunction: (array: string, featureDepedencyId: number, result: any) => any): any {
    var featureModel = featureModel;

    if (dependencyType == 'requiringDependencyTo') {
      featureModel = this.updateFeatureHandler(featureModel, toFeatureId, modificationFunction.bind(null, "requiringDependencyFrom", fromFeatureId))
      //console.log(JSON.stringify(result))
      featureModel = this.updateFeatureHandler(featureModel, fromFeatureId, modificationFunction.bind(null, "requiringDependencyTo", toFeatureId));
      //console.log(JSON.stringify(result))
    } else if (dependencyType == 'requiringDependencyFrom') {
      featureModel = this.updateFeatureHandler(featureModel, toFeatureId, modificationFunction.bind(null, "requiringDependencyTo", fromFeatureId));
      featureModel = this.updateFeatureHandler(featureModel, fromFeatureId, modificationFunction.bind(null, "requiringDependencyFrom", toFeatureId));
    } else {
      featureModel = this.updateFeatureHandler(featureModel, toFeatureId, modificationFunction.bind(null, "excludingDependency", fromFeatureId));
      featureModel = this.updateFeatureHandler(featureModel, fromFeatureId, modificationFunction.bind(null, "excludingDependency", toFeatureId));
    }

    return featureModel;

  }
  /**
   * Get the current feature with additional parentId.
   * @param featureModelId id of the current feature model
   * @param featureId id of the current feature
   */
  getFeatureWithParent(featureModelId: string, featureId: string) {
    return this.db.get(featureModelId).then(result => {
      return this.getFeatureWithParentFromModel(result, featureId);
    });
  }

  /**
   * Get the current feature with additional parentId from a feature model.
   * @param featureModel feature model
   * @param featureId id of the current feature
   */
  private getFeatureWithParentFromModel(featureModel: any, featureId: string) {
    var featureStack: any[] = []
    var featureFound: boolean = false;

    // Insert first level into the stack
    for (var i = 0; i < featureModel['features'].length; i++) {
      var model = featureModel['features'][featureModel['features'].length - 1 - i]
      model.parentId = 0
      featureStack.push(model)
    }

    // Select single feature from the stack
    while (featureStack.length > 0 && !featureFound) {
      var f = featureStack.pop()

      if (f.id == featureId) {
        featureFound = true;
        return f
      }

      // Add new features to the stack
      if (f.features) {
        for (var i = 0; i < f.features.length; i++) {
          var model = f.features[f.features.length - 1 - i]
          model.parentId = f.id
          featureStack.push(model)
        }
      }
    }
  }

  /**
   * Delete the current feature with all dependencies.
   * @param featureModelId id of the current feature model
   * @param featureId id of the current feature
   */
  deleteFeature(featureModelId: string, featureId: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      var parentResult = this.getFeatureWithParentFromModel(result, featureId.toString());
      var featureIdList = this.listSubfeatureIdsHelper(parentResult.features)
      featureIdList.push(featureId);
      delete result['featureMap'][featureId]
      result = this.deleteFeatureAndDependeciesHelper(result, featureIdList, featureId);

      return this.db.put(result);
    })

  }

  /**
   * Helper functino to delete the current feature es the dependencies of the subfeatures.
   * @param featureModel the feature model
   * @param featureIdList list of the subfeature ids
   * @param featureId id of the current feature
   */
  private deleteFeatureAndDependeciesHelper(featureModel: any, featureIdList: any[], featureId: any) {
    var result = featureModel;
    var featureStack: any[] = []
    var featureFound: boolean = false;
    var featureIndex = -1;

    // Insert first level into the stack
    for (var i = 0; i < result['features'].length; i++) {
      var model = result['features'][i];
      featureStack.push(model);
    }

    // Select single feature from the stack
    while (featureStack.length > 0 && !featureFound) {
      var f = featureStack.pop();

      // Delete dependencies
      f.requiringDependencyFrom = f.requiringDependencyFrom.filter(function (e) { return !(featureIdList.includes(e)) });
      f.requiringDependencyTo = f.requiringDependencyTo.filter(function (e) { return !(featureIdList.includes(e)) });
      f.excludingDependency = f.excludingDependency.filter(function (e) { return !(featureIdList.includes(e)) });

      // Add new features to the stack
      if (f.features) {

        for (var i = 0; i < f.features.length; i++) {
          var model = f.features[i];

          // Find Feature
          if (model.id == featureId) {
            featureFound = true;
            featureIndex = i;
          } else {
            featureStack.push(model);
          }

          // Delete feature
          if (featureFound) {
            f.features.splice(featureIndex, 1);
            featureFound = false;
          }

        }
      }
    }

    return result;

  }

  /**
   * Lists the ids of the subfeatures.
   * @param featureList feature list
   */
  listSubfeatureIdsHelper(featureList: any[]): number[] {
    var featureStack: any[] = []
    var featureFound: boolean = false;
    var featureIdList = [];

    // Insert first level into the stack
    for (var i = 0; i < featureList.length; i++) {
      var model = featureList[featureList.length - 1 - i];
      featureStack.push(model);
    }

    // Select single feature from the stack
    while (featureStack.length > 0 && !featureFound) {
      var f = featureStack.pop();

      featureIdList.push(f.id);

      // Add new features to the stack
      if (f.features) {
        for (var i = 0; i < f.features.length; i++) {
          var model = f.features[f.features.length - 1 - i];
          featureStack.push(model);
        }
      }
    }

    return featureIdList;

  }


  /**
   * Update the current feature.
   * @param featureModelId id of the current feature model
   * @param featureId id of the current feature
   * @param featureName name of the current feature
   * @param isMandatory is the current feature mandatory
   * @param hasOrSubfeatures has the current feature or subfeatures
   * @param hasXOrSubfeatures has the current feature xor subfeatures
   * @param subfeatureOf is a subfeature of
   */
  updateFeature(featureModelId: string, featureId: number, featureName: string, isMandatory: boolean, hasOrSubfeatures: boolean, hasXOrSubfeatures: boolean, subfeatureOf: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;
      var parentResult = this.getFeatureWithParentFromModel(result, featureId.toString());

      // Complete updated feature
      var updatedFeature = {
        id: featureId,
        name: featureName,
        isMandatory: this.getBoolean(isMandatory),
        hasOrSubfeatures: this.getBoolean(hasOrSubfeatures),
        hasXOrSubfeatures: this.getBoolean(hasXOrSubfeatures),
        isDeletable: parentResult.isDeletable,
        features: parentResult.features,
        requiringDependencyFrom: parentResult.requiringDependencyFrom,
        requiringDependencyTo: parentResult.requiringDependencyTo,
        excludingDependency: parentResult.excludingDependency
      }

      // Gerenic function to update feature
      var updateFeatureInline = (result: any): any => {
        var result = result;
        result.name = featureName;
        result.isMandatory = this.getBoolean(isMandatory);
        result.hasOrSubfeatures = this.getBoolean(hasOrSubfeatures);
        result.hasXOrSubfeatures = this.getBoolean(hasXOrSubfeatures);

        return result;
      };

      // Generic function to delete feature
      var deleteFeatureInline = (featureId, result: any): any => {
        var result = result;
        result.features = result.features.filter(function (e) { return e.id != featureId });

        return result;
      }

      // Generic function to insert feature
      var insertFeatureInline = (result: any): any => {
        var result = result;
        result.features.push(updatedFeature);
        return result;
      }

      if (parentResult.parentId == subfeatureOf) {
        // No change of category
        result = this.updateFeatureHandler(result, featureId, updateFeatureInline);
      } else {
        // Change of category
        result = this.updateFeatureHandler(result, parentResult.parentId, deleteFeatureInline.bind(null, featureId));
        result = this.updateFeatureHandler(result, subfeatureOf, insertFeatureInline);
      }

      return this.db.put(result);

    });

  }

  /**
   * Add a new feature to the feature model.
   * @param featureModelId id of the feature model
   * @param featureName name of the feature
   * @param isMandatory is the feature mandatory
   * @param hasOrSubfeatures has the feature or subfeatures
   * @param hasXOrSubfeatures has the feature xor subfeatures
   * @param subfeatureOf is subfeature of
   */
  addFeature(featureModelId: string, featureName: string, isMandatory: boolean, hasOrSubfeatures: boolean, hasXOrSubfeatures: boolean, subfeatureOf: number) {
    return this.db.get(featureModelId).then(result => {
      var result = result;

      var feature = this.createFeatureByParameter(result['featureIdCounter'], featureName, isMandatory, hasOrSubfeatures, hasXOrSubfeatures, true);

      // Generich function to insert feature
      var insertFeature = (result: any): any => {
        var result = result;
        result.features.push(feature);
        return result;
      }

      result = this.updateFeatureHandler(result, subfeatureOf, insertFeature);
      result['featureIdCounter'] = result['featureIdCounter'] + 1;
      result['featureMap'][feature.id] = feature.name;

      return this.db.put(result);

    });
  }

  /**
   * Helper function to update the feature model.
   * @param featureModel feature model
   * @param featureId id of the feature
   * @param modificationFunction function to modify feature 
   */
  private updateFeatureHandler(featureModel: any, featureId: number, modificationFunction: (feature: number) => any): any {
    var result = featureModel;
    var featureStack: any[] = []
    var featureFound: boolean = false;


    for (var i = 0; i < result['features'].length; i++) {
      var model = result['features'][result['features'].length - 1 - i];
      featureStack.push(model);
    }

    // Select single feature from the stack
    while (featureStack.length > 0 && !featureFound) {
      var f = featureStack.pop();

      if (f.id == featureId) {
        featureFound = true;
        f = modificationFunction(f);
      }

      // Add new features to the stack
      if (f.features) {
        for (var i = 0; i < f.features.length; i++) {
          var model = f.features[f.features.length - 1 - i];
          featureStack.push(model);
        }
      }
    }

    return result;

  }

  /**
   * Get boolean out of any value.
   * @param value any value
   */
  private getBoolean(value: any): boolean {
    switch (value) {
      case true:
      case "true":
      case 1:
      case "1":
      case "on":
      case "yes":
        return true;
      default:
        return false;
    }
  }

  /**
   * Create a new feature from parameters.
   * @param id id of the feature
   * @param name name of the feature
   * @param isMandatory is the feature mandatory 
   * @param hasOrSubfeatures has the feature or subfeatures
   * @param hasXOrSubfature has the feature xor subfeature
   * @param isDeletetable is the feature deletable
   * @param requiringDependencyFrom requiring to dependencies of the feature
   * @param requiringDependencyTo requiring to dependencies of the feature
   * @param excludingDependency excluding dependencies of the feature
   * @param features subfeatures of the feature
   */
  private createFeatureByParameter(
    id: number,
    name: string,
    isMandatory: boolean = false,
    hasOrSubfeatures: boolean = false,
    hasXOrSubfature: boolean = false,
    isDeletetable: boolean = false,
    requiringDependencyFrom: any[] = [],
    requiringDependencyTo: any[] = [],
    excludingDependency: any[] = [],
    features: any[] = [],
    businessModelIds: any[] = []
  ) {
    return {
      "id": id,
      "name": name,
      "isMandatory": this.getBoolean(isMandatory),
      "hasOrSubfeatures": this.getBoolean(hasOrSubfeatures),
      "hasXOrSubfeatures": this.getBoolean(hasXOrSubfature),
      "isDeletable": this.getBoolean(isDeletetable),
      "requiringDependencyFrom": requiringDependencyFrom,
      "requiringDependencyTo": requiringDependencyTo,
      "excludingDependency": excludingDependency,
      "features": features,
      "businessModelIds": businessModelIds
    };
  }

  /**
   * Add default data to the database.
   */
  public addDefaultData() {
    return this.db.destroy().then(result => {
      this.db = new PouchDB(this.databaseName);

      return this.db.bulkDocs([{
        "name": "Simple ToDo Example",
        "description": "This is the simple todo example from our paper.",
        "featureIdCounter": 31,
        "businessModelIdCounter": 3,
        "features": [
          {
            "id": 1,
            "name": "Value Propositions",
            "isMandatory": true,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": true,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 10,
                "name": "Save Privacy",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  14
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [
                  24,
                  11
                ],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 1
              },
              {
                "id": 11,
                "name": "Free For All",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  24
                ],
                "excludingDependency": [
                  10
                ],
                "features": [],
                "businessModelIds": [],
                "parentId": 1
              },
              {
                "id": 12,
                "name": "Collaborate With Others",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  26
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 1
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 2,
            "name": "Customer Segment",
            "isMandatory": true,
            "hasOrSubfeatures": true,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 13,
                "name": "Private User",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  17
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [],
                "parentId": 2
              },
              {
                "id": 14,
                "name": "Professional User",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  18
                ],
                "requiringDependencyTo": [
                  10
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 2
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 3,
            "name": "Customer Relationships",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 15,
                "name": "Self Service",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 3
              },
              {
                "id": 16,
                "name": "Phone Support",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [],
                "parentId": 3
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 4,
            "name": "Customer Channels",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 17,
                "name": "Facebook Ads",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  13
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 4
              },
              {
                "id": 18,
                "name": "LinkedIn Ads",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  14
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [],
                "parentId": 4
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 5,
            "name": "Key Partners",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 19,
                "name": "Hosting Provider",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [],
                "parentId": 5
              },
              {
                "id": 20,
                "name": "Social Networks",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [],
                "parentId": 5
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 6,
            "name": "Key Activities",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 21,
                "name": "Develop App",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  27
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 6
              },
              {
                "id": 30,
                "name": "Plan Marketing",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  28
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 6
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 7,
            "name": "Key Resources",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 22,
                "name": "Algorithms",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 7
              },
              {
                "id": 23,
                "name": "Infrastructure",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 7
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 8,
            "name": "Revenue Streams",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 24,
                "name": "In-App Advertisement",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  11
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [
                  10
                ],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 8
              },
              {
                "id": 25,
                "name": "License Purchase",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [
                  26
                ],
                "features": [],
                "businessModelIds": [],
                "parentId": 8
              },
              {
                "id": 26,
                "name": "License Subscription",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  12
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [
                  25
                ],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 8
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          },
          {
            "id": 9,
            "name": "Cost Structures",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 27,
                "name": "Development Costs",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  21
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 9
              },
              {
                "id": 28,
                "name": "Marketing Costs",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  30
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [],
                "parentId": 9
              },
              {
                "id": 29,
                "name": "Support Costs",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 9
              }
            ],
            "businessModelIds": [
              1
            ],
            "parentId": 0
          }
        ],
        "featureMap": {
          "1": "Value Proposition",
          "2": "Customer Segments",
          "3": "Customer Relationships",
          "4": "Customer Channel",
          "5": "Key Partners",
          "6": "Key Activities",
          "7": "Key Resources",
          "8": "Revenue Streams",
          "9": "Cost Structure",
          "10": "Save Privacy",
          "11": "Free For All",
          "12": "Collaborative With Others",
          "13": "Private User",
          "14": "Professional User",
          "15": "Self Service",
          "16": "Phone Support",
          "17": "Facebook Ads",
          "18": "LinkedIn Ads",
          "19": "Hosting Provider",
          "20": "Social Networks",
          "21": "Develop App",
          "22": "Algorithms",
          "23": "Infrastructure",
          "24": "In-App Advertisement",
          "25": "License Purchase",
          "26": "License Subscription",
          "27": "Development Costs",
          "28": "Marketing Costs",
          "29": "Support Costs",
          "30": "Plan Marketing"
        },
        "businessModelMap": {
          "1": "Paper Example"
        }
      },
      {
        "name": "Case Study on ToDo Applications",
        "description": "This is the case study of todo applications we perform in our paper.",
        "featureIdCounter": 164,
        "businessModelIdCounter": 12,
        "features": [
          {
            "id": 1,
            "name": "Value Proposition",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 10,
                "name": "Accessibility",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 73,
                    "name": "Anonymous Access",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      75
                    ],
                    "features": [],
                    "businessModelIds": [
                      1,
                      9
                    ],
                    "parentId": 10
                  },
                  {
                    "id": 74,
                    "name": "Simplified Sign-In Servies",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      9,
                      10
                    ],
                    "parentId": 10
                  },
                  {
                    "id": 99,
                    "name": "Multi-OS Access",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      128
                    ],
                    "features": [],
                    "businessModelIds": [
                      2,
                      3
                    ],
                    "parentId": 10
                  },
                  {
                    "id": 100,
                    "name": "Device Syncronisation",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      3
                    ],
                    "parentId": 10
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  10,
                  9
                ],
                "parentId": 1
              },
              {
                "id": 11,
                "name": "Customization",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 75,
                    "name": "Personalized Recommendations",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      73
                    ],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2
                    ],
                    "parentId": 11
                  },
                  {
                    "id": 76,
                    "name": "Changeable User Interfaces",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      5
                    ],
                    "parentId": 11
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  5
                ],
                "parentId": 1
              },
              {
                "id": 12,
                "name": "Design / Usability",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 77,
                    "name": "Execution Step Reduction",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      4
                    ],
                    "parentId": 12
                  },
                  {
                    "id": 78,
                    "name": "Design Pattern Usage",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      3,
                      4,
                      5,
                      6,
                      7
                    ],
                    "parentId": 12
                  }
                ],
                "businessModelIds": [
                  1,
                  3,
                  4,
                  5,
                  6,
                  7
                ],
                "parentId": 1
              },
              {
                "id": 13,
                "name": "Price",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 79,
                    "name": "Free for All",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      81
                    ],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 13
                  },
                  {
                    "id": 80,
                    "name": "Low-Price Strategy",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 13
                  },
                  {
                    "id": 81,
                    "name": "Money-Back Guarantee",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      79
                    ],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 13
                  }
                ],
                "businessModelIds": [
                  1
                ],
                "parentId": 1
              },
              {
                "id": 14,
                "name": "Network",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [
                  58
                ],
                "features": [
                  {
                    "id": 82,
                    "name": "Quantity Network Size",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 14
                  },
                  {
                    "id": 84,
                    "name": "Quality Network Users",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 14
                  }
                ],
                "businessModelIds": [
                  1
                ],
                "parentId": 1
              },
              {
                "id": 101,
                "name": "Function Scope",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 102,
                    "name": "Minimized Scope",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      6,
                      7
                    ],
                    "parentId": 101
                  },
                  {
                    "id": 103,
                    "name": "Maximized Scope",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      3,
                      4,
                      5
                    ],
                    "parentId": 101
                  },
                  {
                    "id": 154,
                    "name": "Medium Scope",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      2
                    ],
                    "parentId": 101
                  }
                ],
                "businessModelIds": [
                  2,
                  3,
                  4,
                  5,
                  6,
                  7
                ],
                "parentId": 1
              },
              {
                "id": 104,
                "name": "Task Management",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 105,
                    "name": "Splitting of Tasks",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      3,
                      4,
                      10,
                      11
                    ],
                    "parentId": 104
                  },
                  {
                    "id": 106,
                    "name": "Work Together",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      58
                    ],
                    "features": [],
                    "businessModelIds": [
                      2,
                      3,
                      4,
                      11
                    ],
                    "parentId": 104
                  }
                ],
                "businessModelIds": [
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  10,
                  11
                ],
                "parentId": 1
              },
              {
                "id": 107,
                "name": "Workflow Management",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 108,
                    "name": "Workflow Templates",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      5,
                      11
                    ],
                    "parentId": 107
                  },
                  {
                    "id": 109,
                    "name": "Workflow Tracker",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      11
                    ],
                    "parentId": 107
                  },
                  {
                    "id": 155,
                    "name": "Intelligent Flow Planer",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      2,
                      11
                    ],
                    "parentId": 107
                  },
                  {
                    "id": 157,
                    "name": "Connect To Calender",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      4,
                      11
                    ],
                    "parentId": 107
                  }
                ],
                "businessModelIds": [
                  2,
                  3,
                  4,
                  5,
                  11
                ],
                "parentId": 1
              },
              {
                "id": 110,
                "name": "Productivity Analysis",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 111,
                    "name": "Light-Weight Tooling",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      5
                    ],
                    "parentId": 110
                  },
                  {
                    "id": 112,
                    "name": "Productivity Optimization",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      10
                    ],
                    "parentId": 110
                  }
                ],
                "businessModelIds": [
                  5,
                  10,
                  11
                ],
                "parentId": 1
              },
              {
                "id": 113,
                "name": "Segment Optimized Functions",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 114,
                    "name": "General",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 115,
                        "name": "Automatic Task Breakdown",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          9,
                          10,
                          11
                        ],
                        "parentId": 114
                      },
                      {
                        "id": 116,
                        "name": "Task Time Prediction",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          10,
                          11
                        ],
                        "parentId": 114
                      },
                      {
                        "id": 117,
                        "name": "Connect To Friends",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [
                          58
                        ],
                        "features": [],
                        "businessModelIds": [
                          8,
                          9
                        ],
                        "parentId": 114
                      }
                    ],
                    "businessModelIds": [
                      8,
                      9,
                      10,
                      11
                    ],
                    "parentId": 113
                  },
                  {
                    "id": 118,
                    "name": "Fitness Functions",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [
                      130
                    ],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 119,
                        "name": "Time To Sport",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          9
                        ],
                        "parentId": 118
                      },
                      {
                        "id": 120,
                        "name": "Calories Tracker",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          9
                        ],
                        "parentId": 118
                      }
                    ],
                    "businessModelIds": [
                      8,
                      9
                    ],
                    "parentId": 113
                  },
                  {
                    "id": 121,
                    "name": "Work&Life Balance",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [
                      131
                    ],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 122,
                        "name": "Optimize Scheduling",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          10
                        ],
                        "parentId": 121
                      },
                      {
                        "id": 123,
                        "name": "Optimize Concentration",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          10
                        ],
                        "parentId": 121
                      }
                    ],
                    "businessModelIds": [
                      8,
                      10
                    ],
                    "parentId": 113
                  },
                  {
                    "id": 124,
                    "name": "Business Functions",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [
                      132
                    ],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 125,
                        "name": "Automatic Task Scheduling",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          11
                        ],
                        "parentId": 124
                      },
                      {
                        "id": 126,
                        "name": "Workflow Tracking",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          11
                        ],
                        "parentId": 124
                      }
                    ],
                    "businessModelIds": [
                      8,
                      11
                    ],
                    "parentId": 113
                  }
                ],
                "businessModelIds": [
                  8,
                  9,
                  10,
                  11
                ],
                "parentId": 1
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          },
          {
            "id": 2,
            "name": "Customer Segment",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 15,
                "name": "Interaction Type",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": true,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 58,
                    "name": "Single-User",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      14,
                      106,
                      117,
                      138
                    ],
                    "features": [],
                    "businessModelIds": [
                      1,
                      7,
                      6,
                      10
                    ],
                    "parentId": 15
                  },
                  {
                    "id": 59,
                    "name": "Single-Sided-Market",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      9,
                      11
                    ],
                    "parentId": 15
                  },
                  {
                    "id": 60,
                    "name": "Multi-Sided-Market",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 15
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 2
              },
              {
                "id": 16,
                "name": "Market Size",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": true,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 61,
                    "name": "Niche Market",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      9,
                      10,
                      11
                    ],
                    "parentId": 16
                  },
                  {
                    "id": 62,
                    "name": "Mass Market",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      6,
                      7
                    ],
                    "parentId": 16
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 2
              },
              {
                "id": 17,
                "name": "Target Group",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 130,
                    "name": "Fitness Improver",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [
                      118
                    ],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8,
                      9
                    ],
                    "parentId": 17
                  },
                  {
                    "id": 131,
                    "name": "Life Improver",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [
                      121
                    ],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8,
                      10
                    ],
                    "parentId": 17
                  },
                  {
                    "id": 132,
                    "name": "Business Improver",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [
                      124
                    ],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8,
                      11
                    ],
                    "parentId": 17
                  }
                ],
                "businessModelIds": [
                  1,
                  8,
                  9,
                  10,
                  11
                ],
                "parentId": 2
              },
              {
                "id": 18,
                "name": "User Type",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 63,
                    "name": "Private User",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      6,
                      7,
                      9,
                      10
                    ],
                    "parentId": 18
                  },
                  {
                    "id": 64,
                    "name": "Professional User",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      11
                    ],
                    "parentId": 18
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 2
              },
              {
                "id": 127,
                "name": "Homing",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": true,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 128,
                    "name": "Single-Homed",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [
                      99
                    ],
                    "features": [],
                    "businessModelIds": [
                      6,
                      7
                    ],
                    "parentId": 127
                  },
                  {
                    "id": 129,
                    "name": "Multi-Homed",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      2,
                      3,
                      4,
                      5,
                      9,
                      10,
                      11
                    ],
                    "parentId": 127
                  }
                ],
                "businessModelIds": [
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 2
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          },
          {
            "id": 3,
            "name": "Customer Relationships",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 19,
                "name": "Customer Aquisition",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 85,
                    "name": "Advertisements",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 136,
                        "name": "Facbook Ads",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [],
                        "parentId": 85
                      }
                    ],
                    "businessModelIds": [
                      1,
                      3,
                      4,
                      5,
                      10,
                      11
                    ],
                    "parentId": 19
                  },
                  {
                    "id": 86,
                    "name": "Friend Invitation System",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      3,
                      4,
                      5,
                      9,
                      10,
                      11
                    ],
                    "parentId": 19
                  },
                  {
                    "id": 133,
                    "name": "Existing Customer Base",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 134,
                        "name": "Brand Customer Base",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [],
                        "parentId": 133
                      },
                      {
                        "id": 135,
                        "name": "OS Customer Base",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [],
                        "parentId": 133
                      }
                    ],
                    "businessModelIds": [
                      2,
                      6,
                      7
                    ],
                    "parentId": 19
                  },
                  {
                    "id": 158,
                    "name": "Online Communities",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8,
                      9,
                      11
                    ],
                    "parentId": 19
                  },
                  {
                    "id": 159,
                    "name": "Facebook Groups",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [
                      35
                    ],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8,
                      9,
                      10
                    ],
                    "parentId": 19
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  8,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 3
              },
              {
                "id": 20,
                "name": "Customer Retention",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 87,
                    "name": "Locked-In",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      5,
                      10,
                      11
                    ],
                    "parentId": 20
                  },
                  {
                    "id": 88,
                    "name": "Gamification",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 137,
                        "name": "Progress Discovery",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [
                          8,
                          9,
                          10,
                          11
                        ],
                        "parentId": 88
                      },
                      {
                        "id": 138,
                        "name": "Friend Challenges",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [
                          58
                        ],
                        "features": [],
                        "businessModelIds": [
                          8,
                          9
                        ],
                        "parentId": 88
                      }
                    ],
                    "businessModelIds": [
                      1,
                      8,
                      9,
                      10,
                      11
                    ],
                    "parentId": 20
                  },
                  {
                    "id": 89,
                    "name": "Customer Support",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      11
                    ],
                    "parentId": 20
                  },
                  {
                    "id": 156,
                    "name": "Free Usage",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      2,
                      9
                    ],
                    "parentId": 20
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  8,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 3
              },
              {
                "id": 21,
                "name": "Boosting Sales",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 92,
                    "name": "Forced Stops",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 21
                  }
                ],
                "businessModelIds": [
                  1
                ],
                "parentId": 3
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          },
          {
            "id": 4,
            "name": "Customer Channels",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 22,
                "name": "Awareness",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 93,
                    "name": "Word-of-Mouth",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      9,
                      10,
                      11
                    ],
                    "parentId": 22
                  },
                  {
                    "id": 94,
                    "name": "Store Placement",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      3,
                      4
                    ],
                    "parentId": 22
                  },
                  {
                    "id": 139,
                    "name": "Facebook Groups",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8,
                      9,
                      10
                    ],
                    "parentId": 22
                  },
                  {
                    "id": 140,
                    "name": "Online Communities",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8,
                      9,
                      11
                    ],
                    "parentId": 22
                  },
                  {
                    "id": 141,
                    "name": "Social Media Ads",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      3,
                      4,
                      8,
                      5,
                      10,
                      11
                    ],
                    "parentId": 22
                  },
                  {
                    "id": 163,
                    "name": "Influencer Marketing",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      8
                    ]
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  8,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 4
              },
              {
                "id": 23,
                "name": "Evaluation",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 95,
                    "name": "Freemium",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      3,
                      4,
                      5,
                      10,
                      11
                    ],
                    "parentId": 23
                  },
                  {
                    "id": 96,
                    "name": "AppStore Optimization",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 143,
                        "name": "Review Reactions",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [],
                        "parentId": 96
                      }
                    ],
                    "businessModelIds": [
                      1,
                      3,
                      9,
                      10,
                      11
                    ],
                    "parentId": 23
                  },
                  {
                    "id": 142,
                    "name": "Company Branding",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      2
                    ],
                    "parentId": 23
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 4
              },
              {
                "id": 24,
                "name": "Purchase",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 67,
                    "name": "In-Store Purchase",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      9,
                      10,
                      11
                    ],
                    "parentId": 24
                  },
                  {
                    "id": 68,
                    "name": "Out-of-Store Purchase",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [
                      44
                    ],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      3,
                      4,
                      5,
                      11
                    ],
                    "parentId": 24
                  },
                  {
                    "id": 161,
                    "name": "No Purchase",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [],
                    "parentId": 24
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 4
              },
              {
                "id": 25,
                "name": "Delivery",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 69,
                    "name": "In-Store Delivery",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      9,
                      10,
                      11
                    ],
                    "parentId": 25
                  },
                  {
                    "id": 70,
                    "name": "Out-of-Store Delivery",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 25
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 4
              },
              {
                "id": 26,
                "name": "After Sales",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 97,
                    "name": "App Updates",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [
                      {
                        "id": 144,
                        "name": "Update with OS",
                        "isMandatory": false,
                        "hasOrSubfeatures": false,
                        "hasXOrSubfeatures": false,
                        "isDeletable": true,
                        "requiringDependencyFrom": [],
                        "requiringDependencyTo": [],
                        "excludingDependency": [],
                        "features": [],
                        "businessModelIds": [],
                        "parentId": 97
                      }
                    ],
                    "businessModelIds": [
                      1,
                      2,
                      3,
                      4,
                      5,
                      9,
                      10,
                      11
                    ],
                    "parentId": 26
                  },
                  {
                    "id": 98,
                    "name": "Content Updates",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      9,
                      10
                    ],
                    "parentId": 26
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 4
              },
              {
                "id": 160,
                "name": "Included in OS",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  6,
                  7
                ],
                "parentId": 4
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          },
          {
            "id": 5,
            "name": "Key Partners",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 38,
                "name": "Advertisement Partner",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  27
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  9
                ],
                "parentId": 5
              },
              {
                "id": 39,
                "name": "App Developer",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 5
              },
              {
                "id": 41,
                "name": "Content Provider",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  9
                ],
                "parentId": 5
              },
              {
                "id": 42,
                "name": "Instrastructure Provider",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 5
              },
              {
                "id": 43,
                "name": "Manufacturing Provider",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 5
              },
              {
                "id": 44,
                "name": "Payment Provider",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  68
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  3,
                  4,
                  5,
                  11
                ],
                "parentId": 5
              },
              {
                "id": 45,
                "name": "Store Provider",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 5
              },
              {
                "id": 151,
                "name": "Third-Party Developer",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  152
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  3,
                  4,
                  5
                ],
                "parentId": 5
              },
              {
                "id": 162,
                "name": "Influencer",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  8
                ]
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          },
          {
            "id": 6,
            "name": "Key Activities",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 46,
                "name": "Develop Hard- and Software",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  32
                ],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 65,
                    "name": "Develop Software",
                    "isMandatory": true,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      3,
                      4,
                      5,
                      6,
                      9,
                      10
                    ],
                    "parentId": 46
                  },
                  {
                    "id": 66,
                    "name": "Develop Hardware",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 46
                  }
                ],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 6
              },
              {
                "id": 47,
                "name": "Negotiate Licenses",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  34
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 6
              },
              {
                "id": 48,
                "name": "Manage Infrastructure",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  33
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  10,
                  11
                ],
                "parentId": 6
              },
              {
                "id": 49,
                "name": "Produce Content",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  36
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  9,
                  10
                ],
                "parentId": 6
              },
              {
                "id": 50,
                "name": "Plan Marketing Campaigns",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  35
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 6
              },
              {
                "id": 51,
                "name": "Support Customer",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  37
                ],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 6
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          },
          {
            "id": 7,
            "name": "Key Resources",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "features": [
              {
                "id": 52,
                "name": "Algorithms",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  3,
                  9,
                  10,
                  11
                ],
                "parentId": 7
              },
              {
                "id": 53,
                "name": "Brands",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 7
              },
              {
                "id": 54,
                "name": "Content",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  9,
                  10
                ],
                "parentId": 7
              },
              {
                "id": 55,
                "name": "Developer License",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 7
              },
              {
                "id": 57,
                "name": "Patents",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 7
              },
              {
                "id": 56,
                "name": "Infrastructure",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [
                  33
                ],
                "excludingDependency": [],
                "parentId": 7
              },
              {
                "id": 152,
                "name": "Developer API",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  151
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  3,
                  4,
                  5
                ],
                "parentId": 7
              }
            ],
            "parentId": 0
          },
          {
            "id": 8,
            "name": "Revenue Streams",
            "isMandatory": false,
            "hasOrSubfeatures": true,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 27,
                "name": "Advertisement",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  38
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 90,
                    "name": "In-App Ads",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1,
                      9
                    ],
                    "parentId": 27
                  },
                  {
                    "id": 91,
                    "name": "Personalized Ads",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 27
                  }
                ],
                "businessModelIds": [
                  1,
                  9
                ],
                "parentId": 8
              },
              {
                "id": 28,
                "name": "Brokerage",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 8
              },
              {
                "id": 29,
                "name": "Donation",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 8
              },
              {
                "id": 30,
                "name": "Sale",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 71,
                    "name": "App Purchase",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 30
                  },
                  {
                    "id": 72,
                    "name": "In-App Purchase",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      1
                    ],
                    "parentId": 30
                  }
                ],
                "businessModelIds": [
                  1
                ],
                "parentId": 8
              },
              {
                "id": 31,
                "name": "Subscription",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 148,
                    "name": "Normal Account",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      3,
                      4,
                      5
                    ],
                    "parentId": 31
                  },
                  {
                    "id": 149,
                    "name": "Professional Account",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      3,
                      4,
                      11
                    ],
                    "parentId": 31
                  },
                  {
                    "id": 150,
                    "name": "Business Account",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      4,
                      5,
                      11
                    ],
                    "parentId": 31
                  }
                ],
                "businessModelIds": [
                  1,
                  3,
                  4,
                  5,
                  10,
                  11
                ],
                "parentId": 8
              },
              {
                "id": 145,
                "name": "Cross-Financed",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [
                  {
                    "id": 146,
                    "name": "Hardware",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      6
                    ],
                    "parentId": 145
                  },
                  {
                    "id": 147,
                    "name": "Software",
                    "isMandatory": false,
                    "hasOrSubfeatures": false,
                    "hasXOrSubfeatures": false,
                    "isDeletable": true,
                    "requiringDependencyFrom": [],
                    "requiringDependencyTo": [],
                    "excludingDependency": [],
                    "features": [],
                    "businessModelIds": [
                      6,
                      7
                    ],
                    "parentId": 145
                  }
                ],
                "businessModelIds": [
                  2,
                  6,
                  7
                ],
                "parentId": 8
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          },
          {
            "id": 9,
            "name": "Cost Structure",
            "isMandatory": false,
            "hasOrSubfeatures": false,
            "hasXOrSubfeatures": false,
            "isDeletable": false,
            "requiringDependencyFrom": [],
            "requiringDependencyTo": [],
            "excludingDependency": [],
            "features": [
              {
                "id": 32,
                "name": "Development",
                "isMandatory": true,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  46
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 9
              },
              {
                "id": 33,
                "name": "Infrastructure",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  48,
                  56
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 9
              },
              {
                "id": 34,
                "name": "Licenses",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  47
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1
                ],
                "parentId": 9
              },
              {
                "id": 35,
                "name": "Marketing",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  50,
                  159
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  9,
                  10,
                  11
                ],
                "parentId": 9
              },
              {
                "id": 36,
                "name": "Production ",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  49
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  9,
                  10
                ],
                "parentId": 9
              },
              {
                "id": 37,
                "name": "Support",
                "isMandatory": false,
                "hasOrSubfeatures": false,
                "hasXOrSubfeatures": false,
                "isDeletable": true,
                "requiringDependencyFrom": [
                  51
                ],
                "requiringDependencyTo": [],
                "excludingDependency": [],
                "features": [],
                "businessModelIds": [
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  9,
                  10,
                  11
                ],
                "parentId": 9
              }
            ],
            "businessModelIds": [
              1,
              2,
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11
            ],
            "parentId": 0
          }
        ],
        "featureMap": {
          "1": "Value Proposition",
          "2": "Customer Segments",
          "3": "Customer Relationships",
          "4": "Customer Channel",
          "5": "Key Partners",
          "6": "Key Activities",
          "7": "Key Resources",
          "8": "Revenue Streams",
          "9": "Cost Structure",
          "10": "Accessibility",
          "11": "Customization",
          "12": "Design / Usability",
          "13": "Price",
          "14": "Network",
          "15": "Interaction Type",
          "16": "Market Size",
          "17": "Target Group",
          "18": "User Type",
          "19": "Customer Aquisition",
          "20": "Customer Retention",
          "21": "Boosting Sales",
          "22": "Awareness",
          "23": "Evaluation",
          "24": "Purchase",
          "25": "Delivery",
          "26": "After Sales",
          "27": "Advertisement",
          "28": "Brokerage",
          "29": "Donation",
          "30": "Sale",
          "31": "Subscription",
          "32": "Development",
          "33": "Infrastructure",
          "34": "Licenses",
          "35": "Marketing",
          "36": "Production ",
          "37": "Support",
          "38": "Advertisement Partner",
          "39": "App Developer",
          "41": "Content Provider",
          "42": "Instrastructure Provider",
          "43": "Manufacturing Provider",
          "44": "Payment Provider",
          "45": "Store Provider",
          "46": "Develop Hard- and Software",
          "47": "Negotiate Licsenses",
          "48": "Manage Infrastructure",
          "49": "Produce Content",
          "50": "Plan Marketing Campaigns",
          "51": "Support Customer",
          "52": "Algorithms",
          "53": "Brands",
          "54": "Content",
          "55": "Developer Licsense",
          "56": "Infrastructure",
          "57": "Patents",
          "58": "Single-User",
          "59": "Single-Sided-Market",
          "60": "Multi-Sided-Market",
          "61": "Niche Market",
          "62": "Mass Market",
          "63": "Private User",
          "64": "Professional User",
          "65": "Develop Software",
          "66": "Develop Hardware",
          "67": "In-Store-Purchase",
          "68": "Out-Of-Store Purchase",
          "69": "In-Store-Delivery",
          "70": "Out-of-Store Delivery",
          "71": "App Purchase",
          "72": "In-App Purchase",
          "73": "Anonymous Access",
          "74": "Simplified Sign-In Servies",
          "75": "Personalized Recommendations",
          "76": "Changeable User Interfaces",
          "77": "Execution Step Reduction",
          "78": "Design Pattern Usage",
          "79": "Free for All",
          "80": "Low-Price Strategy",
          "81": "Money-Back Guarantee",
          "82": "Quantity Network Size",
          "84": "Quality Network Users",
          "85": "Advertisements",
          "86": "Friend Invitation System",
          "87": "Locked-In",
          "88": "Gamification",
          "89": "Customer Support",
          "90": "Inn-App Ads",
          "91": "Personalized Ads",
          "92": "Forced Stops",
          "93": "Word-of-Mouth",
          "94": "Store Placement",
          "95": "Freemium",
          "96": "AppStore Optimization",
          "97": "App Updates",
          "98": "Content Updates",
          "99": "Multi-OS Access",
          "100": "Device Syncronisation",
          "101": "Function Scope",
          "102": "Minimized Scope",
          "103": "Maximized Scope",
          "104": "Task Management",
          "105": "Splitting of Tasks",
          "106": "Work Together",
          "107": "Workflow Management",
          "108": "Workflow Templates",
          "109": "Workflow Tracker",
          "110": "Productivity Analysis",
          "111": "Light-Weight Tooling",
          "112": "Productivity Optimization",
          "113": "Segment Optimized Functions",
          "114": "General",
          "115": "Automatic Task Breakdown",
          "116": "Task Time Prediction",
          "117": "Connect To Friends",
          "118": "Fitness Functions",
          "119": "Time To Sport",
          "120": "Calories Tracker",
          "121": "Work&Life Balance",
          "122": "Optimize Scheduling",
          "123": "Optimize Concentration",
          "124": "Business Functions",
          "125": "Automatic Task Scheduling",
          "126": "Workflow Tracking",
          "127": "Homing",
          "128": "Single-Homed",
          "129": "Multi-Homed",
          "130": "Fitness Improver",
          "131": "Life Improver",
          "132": "Business Improver",
          "133": "Existing Customer Base",
          "134": "Brand Customer Base",
          "135": "OS Customer Base",
          "136": "Facbook Ads",
          "137": "Progress Discovery",
          "138": "Friend Challenges",
          "139": "Facebook Groups",
          "140": "Online Communities",
          "141": "Social Media Ads",
          "142": "Company Branding",
          "143": "Review Reactions",
          "144": "Update with OS",
          "145": "Cross-Financed",
          "146": "Hardware",
          "147": "Software",
          "148": "Normal Account",
          "149": "Professional Account",
          "150": "Business Account",
          "151": "Third-Party Developer",
          "152": "Developer API",
          "154": "Medium Scope",
          "155": "Intelligent Flow Planer",
          "156": "Free Usage",
          "157": "Connect To Calender",
          "158": "Online Communities",
          "159": "Facebook Groups",
          "160": "Included in OS",
          "161": "No Purchase",
          "162": "Influencer",
          "163": "Influencer Marketing"
        },
        "businessModelMap": {
          "1": "Market Analysis",
          "2": "Competitor Analysis: Microsoft Todo",
          "3": "Competitor Analysis: Wunderlist",
          "4": "Competitor Analysis: Any.do",
          "5": "Competitor Analysis: Todoist",
          "6": "Competitor Analysis: Apples iOS",
          "7": "Competitor Analysis Googles Android",
          "8": "Niche Analysis",
          "9": "Customer Analysis: Fitness Improver",
          "10": "Customer Analysis: Work&Life Improver",
          "11": "Customer Analysis: Business Improver"
        }
      }]);

    }, error => {
      return error;
    });    
  }
}
