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
    this.db = new PouchDB(this.databaseName); 

    // Check database connection
    this.db.info().then(function (info) {
      console.log("Database connection: " + info);
    })

    this.getFeatureModelList().then(result => {
      console.log("Res: "+JSON.stringify(result));
    }, error => {
      console.log("Err: "+error);
    })
  }

  /**
   * Get the information about the database.
   */
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
   * Destroy the old database and generate a new one with default data.
   */
  public addDefaultData() {
    return this.db.destroy().then(result => {
      this.db = new PouchDB(this.databaseName);

      return this.db.post({
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
      });

    }, error => {
      // error occurred
      console.log("Add Default Data")
    });
    console.log("Add Default Data")
    
  }
}
