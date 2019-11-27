import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PouchdbService } from '../pouchdb.service';
import { NgbModalRef, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-business-model-view',
  templateUrl: './business-model-view.component.html',
  styleUrls: ['./business-model-view.component.css']
})
/**
 * The BusinessModelViewComponent shows the business model and allow the adding/updating/deleting of business decisions together with a conformance checking.
 * 
 * @author: Sebastian Gottschalk
 */
export class BusinessModelViewComponent implements OnInit {
  featureModelId: any;
  businessModelId: any;
  featureModel: any;
  businessModelName: string;

  modalFeature: any;
  modalUnselectedFeatures: any[]
  modalReference: NgbModalRef;
  addFeatureForm: FormGroup;
  updateBusinessModelForm: FormGroup;

  // Conformance Checking
  conformanceIsChecked: boolean;
  conformanceProblemFeatureIds: any[];
  conformanceProblemErrors: string[];


  @ViewChild('addModal', { 'static': true }) addModal: any;
  @ViewChild('deleteModal', { 'static': true }) deleteModal: any;

  /**
   * Create a new instance of the BusinessModelViewComponent.
   * @param route ActivatedRoute
   * @param router Router
   * @param pouchDBServer PouchdbService
   * @param modalService NgbModal
   * @param fb FormBuilder
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pouchDBServer: PouchdbService,
    private modalService: NgbModal,
    private fb: FormBuilder

  ) { 
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };

  }

  /**
   * Initialize the component.
   */
  ngOnInit() {
    this.addFeatureForm = this.fb.group({ featurename: ['', Validators.required] });
    this.updateBusinessModelForm = this.fb.group({ name: ['', Validators.required] });
    this.featureModelId = this.route.snapshot.paramMap.get('id');
    this.businessModelId = this.route.snapshot.paramMap.get('bmid');

    // Init conformance checking
    this.conformanceIsChecked = false;
    this.conformanceProblemErrors = [];

    // Init the feature model
    this.loadFeatureModel();

  }

  /**
   * Load the feature model an clean other values
   */
  private loadFeatureModel() {
    this.pouchDBServer.getFeatureModel(this.featureModelId).then(result => {
      this.featureModel = result;
      this.businessModelName = this.featureModel.businessModelMap[this.businessModelId];
      this.updateBusinessModelForm.setValue({ name: this.businessModelName })
      this.conformanceProblemErrors = [];
      this.conformanceProblemFeatureIds = [];
      if (this.conformanceIsChecked) {
        this.checkConformance();
      }

    }, error => {
      console.log("LoadFeatureModel: " + error);
    })
  }

  /**
   * Opens the delete modal to delete a business model decision.
   * @param featureId id of the current feature
   */
  deleteFeatureModal(featureId): void {
    this.pouchDBServer.getFeatureWithParent(this.featureModelId, featureId).then(result => {
      this.modalFeature = result;
      this.modalReference = this.modalService.open(this.deleteModal, { size: 'lg' });

    }, error => {
      console.log("DeleteFeatureModal: " + error);
    })
  }

  /**
   * Opens the delete modal to add a business model decision.
   * @param featureId id of the current feature
   */
  addFeatureModal(featureId): void {
    console.log("Feature: "+featureId)
    this.pouchDBServer.getFeatureWithParent(this.featureModelId, featureId).then(result => {
      this.modalFeature = result;
      this.modalUnselectedFeatures = this.getUnselectedFeatures(this.modalFeature);
      this.modalReference = this.modalService.open(this.addModal, { size: 'lg' });

    }, error => {
      console.log("DeleteFeatureModal: " + error);
    })
  }

  /**
   * Add the current feature.
   */
  addFeature(): void {
    this.pouchDBServer.addFeature(this.featureModelId, this.addFeatureForm.value.featurename, false, false, false, this.modalFeature.id).then(result => {
      this.addBusinessModelDecision(this.featureModel.featureIdCounter);

    }, error => {
      console.log("AddFeature: " + error);
    });

    // Reset the form
    this.addFeatureForm.reset()
  }

  /**
   * Delete a business model decision.
   * @param featureId id of the current feature
   */
  deleteBusinessModelDecision(featureId): void {
    this.pouchDBServer.removeBusinessDecision(this.featureModelId, featureId, this.businessModelId).then(result => {
      this.pouchDBServer.getFeatureWithParent(this.featureModelId, this.modalFeature.id).then(resultNew => {
        this.conformanceProblemErrors = [];
        this.conformanceProblemFeatureIds = [];
        this.checkConformance();
        this.closeModal();

      }, error => {
        console.log("DeleteBusinessModelDecision (new load): " + error);
      });

    }, error => {
      console.log("DeleteBusinessModelDecision: " + error);
    })
  }

  /**
   * Add a business model decision.
   * @param featureId id of the current feature
   */
  addBusinessModelDecision(featureId): void {
    this.pouchDBServer.addBusinessDecision(this.featureModelId, featureId, this.businessModelId).then(result => {
      this.pouchDBServer.getFeatureWithParent(this.featureModelId, this.modalFeature.id).then(resultNew => {
        this.modalFeature = resultNew;
        this.modalUnselectedFeatures = this.getUnselectedFeatures(this.modalFeature);
        this.loadFeatureModel();

      }, error => {
        console.log("AddBusinessModelDecision (new load): " + error);
      });

    }, error => {
      console.log("AddBusinessModelDecision: " + error);
    })
  }

  /**
   * Update the business model.
   */
  updateBusinessModel() {
    this.pouchDBServer.updateBusinessModel(this.featureModelId, this.businessModelId, this.updateBusinessModelForm.value.name).then(result => {
      this.loadFeatureModel();

    }, error => {
      console.log("UpdateBusinessModel: " + error);
    });
  }

  /**
   * Create adaptation of the business model.
   */
  createAdaptation() {
      var nameSplit = this.businessModelName.split(" - Adaptation#")
      var adaptationName;
      console.log(nameSplit.length)
      if(nameSplit.length > 1 && parseInt(nameSplit[nameSplit.length -1]) != NaN) {
        adaptationName = nameSplit[0]+" - Adaptation#"+(parseInt(nameSplit[nameSplit.length -1]) + 1);
      } else {
        adaptationName = nameSplit[0]+" - Adaptation#1"
      }
      
      this.pouchDBServer.adaptBusinessModel(this.featureModelId, this.businessModelId, adaptationName).then(result => {
        this.pouchDBServer.getFeatureModel(this.featureModelId).then(result => {
          var businessModelKeys = Object.keys(result['businessModelMap']);
          this.router.navigateByUrl('/businessmodelview/'+this.featureModelId+'/'+businessModelKeys[businessModelKeys.length - 1]);
        }, error => {
          console.log("CreateAdaptation (inner): ");

        });
      }, error => {
        console.log("CreateAdaptation: ")
      })
  }

  /**
   * Uncheck the conformance.
   */
  uncheckConformance() {
    this.conformanceIsChecked = false;
    this.conformanceProblemErrors = [];
    this.conformanceProblemFeatureIds = [];
  }

  /**
   * Check the conformance.
   */
  checkConformance() {
    // Init conformance checking
    this.conformanceIsChecked = true;
    this.conformanceProblemFeatureIds = [];
    this.conformanceProblemErrors = [];

    let errorIdSet = new Set();

    var featureStack: any[] = []
    var featureList = this.featureModel.features;
    var selectedFeatureList = this.selectedFeatureList(featureList)

    // Insert first level into the stack
    for (var i = 0; i < featureList.length; i++) {
      var model = featureList[featureList.length - 1 - i];
      featureStack.push(model);
    }

    // Select single feature from the stack
    while (featureStack.length > 0) {
      var f = featureStack.pop();

      var error = false;
      // Try to find different conformance errors

      // Feature is mandatory
      if (f.isMandatory && f.businessModelIds.indexOf(parseInt(this.businessModelId)) == -1) {
        errorIdSet.add(f.id);
        this.conformanceProblemErrors.push(f.name + " is mandatory");
        //console.log("Error: " + f.name + " is mandatory");
        error = true
      }

      // Feature has OR
      if (f.hasOrSubfeatures && this.numberOfSelectedSubfeaturesHelper(f.features) == 0) {
        //console.log("Error: " + f.name + " needs at least one subfeature")
        errorIdSet.add(f.id);
        this.conformanceProblemErrors.push(f.name + " needs at least one subfeature");
        error = true
      }

      // Feature has XOR
      if (f.hasXOrSubfeatures && this.numberOfSelectedSubfeaturesHelper(f.features) != 1) {
        //console.log("Error: " + f.name + " needs exactly one subfeature")
        errorIdSet.add(f.id);
        this.conformanceProblemErrors.push(f.name + " needs exactly one subfeature");
        error = true
      }

      // Feature is required
      if (f.requiringDependencyTo.length != 0) {
        for (var i = 0; i < f.requiringDependencyTo.length; i++) {
          if (selectedFeatureList.indexOf(f.requiringDependencyTo[i]) == - 1) {
            //console.log("Error: " + f.name + " requires the feature " + this.featureModel.featureMap[f.requiringDependencyTo[i]])
            errorIdSet.add(f.id);
            this.conformanceProblemErrors.push(f.name + " requires the feature " + this.featureModel.featureMap[f.requiringDependencyTo[i]]);
            error = true
          }
        }
      }

      // Feature is excluded
      if (f.excludingDependency.length != 0) {
        for (var i = 0; i < f.excludingDependency.length; i++) {
          if (selectedFeatureList.indexOf(f.excludingDependency[i]) != - 1) {
            //console.log("Error: " + f.name + " excludes the feature " + this.featureModel.featureMap[f.excludingDependency[i]])
            errorIdSet.add(f.id);
            this.conformanceProblemErrors.push(f.name + " excludes the feature " + this.featureModel.featureMap[f.excludingDependency[i]]);
            error = true

          }
        }
      }

      // Add new features to the stack
      if (f.features) {
        for (var i = 0; i < f.features.length; i++) {
          var model = f.features[f.features.length - 1 - i];
          if (model.isMandatory || model.businessModelIds.indexOf(parseInt(this.businessModelId)) != -1) {
            featureStack.push(model);
          }
        }
      }
    }

    // Push conformance errors
    for (let id of errorIdSet) {
      this.conformanceProblemFeatureIds.push(parseInt(id.toString()));
    }
  }

  /**
   * Helper function to get the number of selected subfeatures.
   * @param featureList feature list
   */
  numberOfSelectedSubfeaturesHelper(featureList: any[]): number {
    var counter = 0;

    for (var i = 0; i < featureList.length; i++) {
      if (featureList[i].businessModelIds.indexOf(parseInt(this.businessModelId)) != -1) {
        counter = counter + 1;
      }
    }

    return counter;
  }

  /**
   * Helper function to get all selected feature from a feature list.
   * @param featureList feature list
   */
  selectedFeatureList(featureList: any[]): any[] {
    var returnList = []

    var featureStack: any[] = []

    // Insert first level into the stack
    for (var i = 0; i < featureList.length; i++) {
      var model = featureList[featureList.length - 1 - i];
      featureStack.push(model);
      returnList.push(model.id);
    }

    // Select single feature from the stack
    while (featureStack.length > 0) {
      var f = featureStack.pop();

      if (f.businessModelIds.indexOf(parseInt(this.businessModelId)) != -1) {
        returnList.push(f.id)
      }

      // Add new features to the stack
      if (f.features) {
        for (var i = 0; i < f.features.length; i++) {
          var model = f.features[f.features.length - 1 - i];
          featureStack.push(model);
        }
      }
    }

    return returnList;
  }

  /**
   * Helper function to get all unselected subfeature from a feature.
   * @param feature the feature
   */
  getUnselectedFeatures(feature: any): any[] {
    var returnFeatures = []

    console.log(JSON.stringify(feature))
    
    for (var i = 0; i < feature.features.length; i++) {
      if (!feature.features[i]['businessModelIds'].includes(parseInt(this.businessModelId))) {
        returnFeatures.push(feature.features[i])
      }
    }

    return returnFeatures;
  }

  /**
   * Closes the current modal.
   */
  closeModal() {
    this.modalReference.close();
    this.modalFeature = null;

    // Reload views
    this.loadFeatureModel();
  }
}
