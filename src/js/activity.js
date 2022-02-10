import ko from "knockout";
import $ from "jquery";
import { toHHMMSS } from "./util.js";

export class ActivityManager {
  currentSubmissionVm;
  currentSubmissionsList;
  
  currentActivityTimer;
  
  baseCategory = "";
  // HOLY SHIT THIS WAS GRABBED FROM STACKOVERFLOW
  
  
  
  currentCategory;
  currentActivityMonitorVM;
  
  currentActivityStartTime;
  
  
  // For edit page
  currentActivityEditVM;
}


export class Activity {
  category;
  subcategory;
  duration;
  categoryName;
  subcategoryName;
  className;
  constructor( category, subcategory, duration ) {
    this.category = category;
    this.subcategory = subcategory;
    this.duration = duration;
  
    this.categoryName = this.category.Description;
    this.subcategoryName = this.subcategory.Description;
  
    this.className = "categoryClass" + this.category.CategoryID;
  }
}

// For edit page
export class ActivityEditVM {

  categoryList = new Array();
  items = ko.observableArray( [] );

  updateActivity( item ) {
    var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" ),
        x = ActivityManager.currentActivityEditVM.items();

    x[ item.submissionItemID() ] = item;
    ActivityManager.currentActivityEditVM.items( x );

    temp[ item.submissionID() ].SubmissionItems[ item.submissionItemID() ] = {
      SubmissionItemID: item.submissionItemID(),
      CategoryID: item.category().CategoryID,
      SubcategoryID: item.subcategory().SubcategoryID,
      Description: item.notes(),
      Duration: item.duration(),
      StartTime: item.startTime(),
      EndTime: item.endTime()
    };
    localStorage.setItem( "Session", JSON.stringify( temp ) );

    item.dirtyCategory( item.category() );
    item.dirtySubcategory( item.subcategory() );
    item.dirtyNotes( item.notes() );
  }
}

export class ActivityItemEdit {
  constructor( id, iid, c, sc, n, st, et, d, cl ) {

    this.submissionID = ko.observable( id );
    this.submissionItemID = ko.observable( iid );
    this.category = ko.observable( c );
    this.subcategory = ko.observable( sc );
    this.notes = ko.observable( n );
    this.startTime = ko.observable( st );
    this.endTime = ko.observable( et );
    this.duration = ko.observable( d );
    this.categoryList = ko.observable( cl );

    this.dirtyCategory = ko.observable( c );
    this.dirtySubcategory = ko.observable( sc );
    this.dirtyNotes = ko.observable( n );

    this.isDirty = ko.computed( () => {
      return this.category() != this.dirtyCategory() || this.subcategory() != this
        .dirtySubcategory() || this.notes() != this.dirtyNotes();
    } );

    this.category.subscribe( () => {
      this.subcategory( undefined );
    } );
  }}



export class ActivityTimer {

  INTERVAL = 1000;
  milliseconds = 0;

  display() {
    $( "#activityTimerText" ).text( toHHMMSS( this.milliseconds ) );
  }

  displayedTime() {}

  start() {
    this.milliseconds = 0;

    if( this.timerObj ) window.clearInterval( this.timerObj );
    this.display();
    this.timerObj = setInterval( () => {
      this.milliseconds += this.INTERVAL;
      this.display();
    }, this.INTERVAL );
  }

}


export class Category {  
  constructor( categories ) {
    this.categoryList = categories;
    this.category = ko.observable();
    this.subcategory = ko.observable();
    this.notes = ko.observable();
    this.category.subscribe( () => {
      this.subcategory( undefined );
    } );
  }
}

export class ActivityMonitor {
  activityList = new ko.observableArray();
  className = new ko.observable();
  teacherName = new ko.observable();

  addActivity( category, subcategory, duration ) {
    this.activityList.unshift( new Activity( category, subcategory, duration ) );
  }

  clearActivities() {
    this.activityList( new Array() );
  }
}