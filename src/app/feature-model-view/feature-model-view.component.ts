import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PouchdbService } from '../pouchdb.service';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-feature-model-view',
  templateUrl: './feature-model-view.component.html',
  styleUrls: ['./feature-model-view.component.css']
})
/**
 * The FeatureModelViewComponent shows the feature model mapped to the building blocks of the canvas.
 * 
 * @author: Sebastian Gottschalk
 */
export class FeatureModelViewComponent implements OnInit {
  featureModelId: string;
  featureModel: any;
  businessModelList: any[];
  businessModelForm = this.fb.group({ name: ['', Validators.required] });

  /**
   * Create a new instance of the FeatureModelViewComponent.
   * @param route ActivatedRoute
   * @param pouchDBServer PouchdbService
   * @param router Router
   * @param fb FormBuilder
   */
  constructor(
    private route: ActivatedRoute,
    private pouchDBServer: PouchdbService,
    private router: Router,
    private fb: FormBuilder
  ) { }

  /**
   * Initialize the component.
   */
  ngOnInit() {
    this.featureModelId = this.route.snapshot.paramMap.get('id');
    this.businessModelList = []
    this.loadFeatureModel(this.featureModelId);

  }

  /**
   * Add a new business model.
   */
  addBusinessModel() {
    this.pouchDBServer.addBusinessModel(this.featureModelId, this.businessModelForm.value.name).then(result => {
      this.businessModelForm.reset();
      this.loadFeatureModel(this.featureModelId);
    },
      error => {
        console.log("AddBusinessModel: " + error);
      })
  }

  /**
   * Navigate to a single business model.
   * @param businessModelId id of the business model
   */
  viewBusinessModel(businessModelId: string): void {
    this.router.navigate(['/businessmodelview', this.featureModelId, businessModelId]);
  }

  /**
   * Delete a business model by id.
   * @param businessModelId id of the business model
   */
  deleteBusinessModel(businessModelId: string): void {
    this.pouchDBServer.deleteBusinessModel(this.featureModelId, parseInt(businessModelId)).then(result => {
      this.loadFeatureModel(this.featureModelId);
    }, error => {
      console.log("DeleteBusinessModel: " + error);
    });
  }

  /**
   * Load the current feature model.
   * @param featureModelId id of the current feature model
   */
  private loadFeatureModel(featureModelId) {
    this.pouchDBServer.getFeatureModel(this.featureModelId).then(result => {
      this.featureModel = result;
      this.businessModelList = [];

      // Load business models
      for (var model in this.featureModel.businessModelMap) {
        this.businessModelList.push({ 'id': model, name: this.featureModel.businessModelMap[model] })
      }
    }, error => {
      console.log("LoadFeatureModel: " + error);
    })
  }

}
