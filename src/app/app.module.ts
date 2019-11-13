import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FeatureModelComponent } from './feature-model/feature-model.component';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FeatureModelDetailComponent } from './feature-model-detail/feature-model-detail.component';
import { FeatureTreeComponent } from './feature-tree/feature-tree.component';

import { AppBootstrapModule } from './app-bootstrap.module';
import { FeatureModelViewComponent } from './feature-model-view/feature-model-view.component';
import { FeatureBuildingBlockComponent } from './feature-building-block/feature-building-block.component';
import { BusinessModelViewComponent } from './business-model-view/business-model-view.component';
import { CanvasBuildingBlockComponent } from './canvas-building-block/canvas-building-block.component';
import { ToolExplanationComponent } from './tool-explanation/tool-explanation.component';
import { ImportExportManagerComponent } from './import-export-manager/import-export-manager.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    AppComponent,
    FeatureModelComponent,
    FeatureModelDetailComponent,
    FeatureTreeComponent,
    FeatureBuildingBlockComponent,
    FeatureModelViewComponent,
    BusinessModelViewComponent,
    CanvasBuildingBlockComponent,
    ToolExplanationComponent,
    ImportExportManagerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
