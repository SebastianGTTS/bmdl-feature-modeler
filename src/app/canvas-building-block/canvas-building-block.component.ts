import { Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'app-canvas-building-block',
  templateUrl: './canvas-building-block.component.html',
  styleUrls: ['./canvas-building-block.component.css']
})
/**
 * Internal class to display single business model decisions of the business model canvas.
 * 
 * @author Sebastian Gottschalk
 */
export class CanvasBuildingBlockComponent {
  @Input() feature: any;
  @Input() levelDepth: number;
  @Input() businessModelId: number;
  @Input() doubleBlock: boolean;
  @Input() conformanceProblemFeatureIdList: any[]; 

  @Output() addFeatureEmitter = new EventEmitter();
  @Output() deleteFeatureEmitter = new EventEmitter();

  /**
   * Create a new instance of the CanvasBuildingBlockComponent.
   */
  constructor() { 
    this.conformanceProblemFeatureIdList = [];
  }

  /**
   * Emit Event to add feature.
   * @param featureId current feature
   */
  addFeature(featureId: number){
    this.addFeatureEmitter.emit(featureId);
  }

  /**
   * Emit Event to delete feature.
   * @param featureId current feature
   */
  deleteFeature(featureId: number){
    this.deleteFeatureEmitter.emit(featureId);
  }

  /**
   * Forward event emitter to add feature.
   * @param featureId current feature
   */
  addFeatureForwardEmitter(featureId:any){
    this.addFeature(featureId)
  }

  /**
   * Forward event emitter to delete feature.
   * @param featureId 
   */
  deleteFeatureForwardEmitter(featureId:any){
    this.deleteFeature(featureId)
  }

  /**
   * Helper function to check wheater an item is included in an array.
   * @param array the array
   * @param item the item
   */
  includes(array: any[], item: any): Boolean{
    if(array && array.includes(parseInt(item))) {
      return true;
    }
    return false;
  }
}
