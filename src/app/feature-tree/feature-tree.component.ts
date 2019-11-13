import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-feature-tree',
  templateUrl: './feature-tree.component.html',
  styleUrls: ['./feature-tree.component.css']
})
/**
 * Internal class to display single features of the feature tree.
 * 
 * @author Sebastian Gottschalk
 */
export class FeatureTreeComponent {
  @Input() features: any[];
  @Output() openDependenciesEmitter = new EventEmitter();
  @Output() updateFeatureEmitter = new EventEmitter();
  @Output() deleteFeatureEmitter = new EventEmitter();

  /**
   * Emit Event to open dependencies of current feature.
   * @param featureId current feature
   */
  openDependencies(featureId: any){
    this.openDependenciesEmitter.emit(featureId)
  }

  /**
   * Forward event emitter to open dependencies of current feature.
   * @param featureId current feature
   */
  openDependenciesForwardEmitter(featureId:any){
    this.openDependencies(featureId)
  }

  /**
   * Emit Event to update current feature.
   * @param featureId current feature
   */
  updateFeature(featureId: any){
    this.updateFeatureEmitter.emit(featureId)
  }

  /**
   * Forward event emitter to update current feature.
   * @param featureId current feature
   */
  updateFeatureForwardEmitter(featureId:any){
    this.updateFeature(featureId)
  }

  /**
   * Emit Event to delete current feature.
   * @param featureId current feature
   */
  deleteFeature(featureId: any){
    this.deleteFeatureEmitter.emit(featureId)
  }

  /**
   * Forward event emitter to delete current feature.
   * @param featureId current feature
   */
  deleteFeatureForwardEmitter(featureId:any){
    this.deleteFeature(featureId)
  }

}
