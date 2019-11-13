import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { PouchdbService } from '../pouchdb.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-feature-model-detail',
  templateUrl: './feature-model-detail.component.html',
  styleUrls: ['./feature-model-detail.component.css']
})
/**
 * The FeatureModelDetailComponent shows the feature model and allow the adding/updating/deleting of features and dependencies.
 * 
 * @author: Sebastian Gottschalk
 */
export class FeatureModelDetailComponent implements OnInit {
  // Variables for the feature model representation
  featureList: any[] = [];
  featureModelId: string;
  featureModel: any;
  // Variables for the modal representation
  modalFeature: any;
  modalReference: NgbModalRef;
  modalDependency: any;
  modalSubfeatureIds: any[];
  // References to form groups 
  featureModelForm: FormGroup;
  featureForm: FormGroup;
  dependencyForm: FormGroup;
  modalFeatureForm: FormGroup;
  // References for modal children
  @ViewChild('dependencyModal', { 'static': true }) dependencyModal: any;
  @ViewChild('updateModal', { 'static': true }) updateModal: any;
  @ViewChild('deleteModal', { 'static': true }) deleteModal: any;

  /**
   * Creates a new instance of the FeatureModelDetailComponent. 
   * @param fb FormBuilder 
   * @param route ActivatedRoute 
   * @param location Location
   * @param pouchDBServer PouchdbService
   * @param modalService NgbModal
   */
  constructor(private fb: FormBuilder,
    private route: ActivatedRoute,
    private location: Location,
    private pouchDBServer: PouchdbService,
    private modalService: NgbModal
  ) {
    // Empty constructor
  }

  /**
   * Initialize the component.
   */
  ngOnInit() {
    // Save feature model id
    this.featureModelId = this.route.snapshot.paramMap.get('id');
    this.loadFeatureModel(this.featureModelId);
    this.loadForms();
  }

  /**
   * Opens the dependency modal of the current feature.
   * @param featureId id of the current feature
   */
  openDependenciesModal(featureId) {
    this.pouchDBServer.getFeatureWithParent(this.featureModelId, featureId).then(result => {
      this.modalFeature = result;
      this.modalReference = this.modalService.open(this.dependencyModal, { size: 'lg' });
    }, error => {
      console.log("OpenDependencyModal: " + error);
    })
  }

  /**
   * Opens the update modal of the current feature.
   * @param featureId id of the current feature
   */
  updateFeatureModal(featureId) {
    this.pouchDBServer.getFeatureWithParent(this.featureModelId, featureId).then(result => {
      this.modalFeature = result;
      this.modalSubfeatureIds = this.pouchDBServer.listSubfeatureIdsHelper(this.modalFeature.features);
      this.modalFeatureForm = this.fb.group({ name: [this.modalFeature.name, Validators.required], isMandatory: this.modalFeature.isMandatory, hasOrSubfeatures: this.modalFeature.hasOrSubfeatures, hasXOrSubfeatures: this.modalFeature.hasXOrSubfeatures, subfeatureOf: this.modalFeature.parentId });
      this.modalReference = this.modalService.open(this.updateModal, { size: 'lg' });
    }, error => {
      console.log("UpdateFeatureModal: " + error);
    })
  }

  /**
   * Opens the modal of the current feature.
   * @param featureId id of the current feature
   */
  deleteFeatureModal(featureId) {
    this.pouchDBServer.getFeatureWithParent(this.featureModelId, featureId).then(result => {
      this.modalFeature = result;
      this.modalReference = this.modalService.open(this.deleteModal, { size: 'lg' });
    }, error => {
      console.log("DeleteFeatureModal: " + error);
    });
  }

  /**
   * Closes the current modal.
   */
  closeModal() {
    this.modalReference.close();
    this.modalFeature = null;

    // Reload views
    this.loadForms();
    this.loadFeatureModel(this.featureModelId);
  }

  /**
   * Delete the dependency between two feature models.
   * @param dependencyType type of the dependency
   * @param fromFeatureId id of the first feature model
   * @param toFeatureId id of the second feature model
   */
  deleteDependency(dependencyType: string, fromFeatureId: number, toFeatureId: number): void {
    this.pouchDBServer.deleteDependency(this.featureModelId, dependencyType, fromFeatureId, toFeatureId).then(result => {
      // Update the modal view
      this.pouchDBServer.getFeatureWithParent(this.featureModelId, this.modalFeature.id).then(result => {
        this.modalFeature = result;
        this.loadFeatureModel(this.featureModelId);
      }, error => {
        console.log("DeleteDependency (new load): " + error);
      });
    }, error => {
      console.log("DeleteDependency: " + error);
    });
  }

  /**
   * Update the current feature.
   */
  updateFeature() {
    this.pouchDBServer.updateFeature(this.featureModelId, this.modalFeature.id, this.modalFeatureForm.value.name, this.modalFeatureForm.value.isMandatory, this.modalFeatureForm.value.hasOrSubfeatures, this.modalFeatureForm.value.hasXOrSubfeatures, this.modalFeatureForm.value.subfeatureOf).then(result => {
      this.closeModal();
    }, error => {
      console.log("UpdateFeature: " + error);
    });
  }

  /**
   * Delete the current feature.
   * @param featureId id of the current feature
   */
  deleteFeature(featureId) {
    this.pouchDBServer.deleteFeature(this.featureModelId, featureId).then(result => {
      this.closeModal();
    }, error => {
      console.log("DeleteFeature: " + error);
    });
  }

  /**
   * Reload the forms
   */
  private loadForms() {
    this.featureModelForm = this.fb.group({ name: ['', Validators.required], description: [''] });
    this.featureForm = this.fb.group({ featureName: ['', Validators.required], isMandatory: false, hasOrSubfeatures: false, hasXOrSubfeatures: false, subfeatureOf: ["1"] });
    this.dependencyForm = this.fb.group({ dependencyType: 'requiringDependencyTo', fromFeatureId: ["1"], toFeatureId: ["2"] })
  }

  /**
   * Load the current feature model
   * @param featureModelId id of the feature model
   */
  private loadFeatureModel(featureModelId) {
    this.pouchDBServer.getFeatureModel(this.featureModelId).then(result => {
      this.featureModel = result;
      this.featureModelForm.patchValue({ name: this.featureModel.name, description: this.featureModel.description });
      this.featureList = this.getFeaturesAsList();
    }, error => {
      console.log("LoadFeatureModel: " + error);
    })
  }

  /**
   * Insert a new feature.
   */
  insertFeature(): void {
    this.pouchDBServer.addFeature(this.featureModelId, this.featureForm.value.featureName, this.featureForm.value.isMandatory, this.featureForm.value.hasOrSubfeatures, this.featureForm.value.hasXOrSubfeatures, this.featureForm.value.subfeatureOf).then(result => {
      this.loadForms();
      this.loadFeatureModel(this.featureModelId);
    }, error => {
      console.log("InsertFeature: " + error);
    });
  }

  /**
   * Insert a new dependency.
   */
  insertDependency(): void {
    this.pouchDBServer.addDependency(this.featureModelId, this.dependencyForm.value.dependencyType, this.dependencyForm.value.fromFeatureId, this.dependencyForm.value.toFeatureId).then(result => {
      this.loadForms();
      this.loadFeatureModel(this.featureModelId);
    }, error => {
      console.log("InsertDependency: " + error);
    });
  }

  /**
   * Update the current feature model.
   */
  updateFeatureModel(): void {
    this.pouchDBServer.updateFeatureModel(this.featureModel._id, this.featureModelForm.value.name, this.featureModelForm.value.description).then(result => {
      // Do nothing
    }, error => {
      console.log("UpdateFeatureModel: " + error);
    });
  }

  /**
   * Delete the current feature model.
   */
  deleteFeatureModel(): void {
    this.pouchDBServer.deleteFeatureModel(this.featureModel._id).then(result => {
      // Return back to home page
      this.location.back();
    }, error => {
      console.log("DeleteFeatureModel: " + error);
    });
  }

  /**
   * Create a list of all features.
   */
  getFeaturesAsList(): any[] {
    var featureList: any[] = []
    var featureStack: any[] = []

    // Insert first level into the stack
    for (var i = 0; i < this.featureModel.features.length; i++) {
      var model = this.featureModel.features[this.featureModel.features.length - 1 - i]
      model.level = 1;
      featureStack.push(model); 
    }

    // Select single feature from the stack
    while (featureStack.length > 0) {
      var f = featureStack.pop();
      featureList.push({ id: f.id, name: f.name, levelname: "-".repeat(f.level) + " " + f.name, level: f.level });
      
      // Add new features to the stack
      if (f.features) {
        for (var i = 0; i < f.features.length; i++) {
          var model = f.features[f.features.length - 1 - i];
          model.level = f.level + 1;
          featureStack.push(model);
        }
      }
    }

    return featureList
  }

}
