/* global ko, $, moment, setformfieldsize, Highcharts, _, _gaq, bootbox, currentVm */
/* eslint "jsdoc/require-jsdoc": "off" */

/*
@TODO - add a back/prev button
@TODO - actually format and print a document
*/

var pages;
var currentPageIndex;

var FIRSTPAGEINDEX = 0;
var LASTPAGEINDEX;
var FADEINTERVAL = 350;

// Minimum allowable time for submission of new activity
// @FIXME 5
var ACTIVITYSUBMISSIONTHRESHOLD = 0;

var currentSubmissionVm;
var currentSubmissionsList;

var currentActivityTimer;

var baseCategory = "";
// HOLY SHIT THIS WAS GRABBED FROM STACKOVERFLOW
Number.prototype.toHHMMSS = function() {
  var millisec_numb = parseInt( this );
  var sec_numb = millisec_numb / 1000;
  var hours = Math.floor( sec_numb / 3600 );
  var minutes = Math.floor( ( sec_numb - ( hours * 3600 ) ) / 60 );
  var seconds = sec_numb - ( hours * 3600 ) - ( minutes * 60 );
  if ( hours < 10 ) hours = "0" + hours;
  if ( minutes < 10 ) minutes = "0" + minutes;
  if ( seconds < 10 ) seconds = "0" + seconds;
  var time = hours + ":" + minutes + ":" + seconds;
  return time;
};


var activityTimer = function() {

  var self = this;
  self.INTERVAL = 1000;

  self.milliseconds = 0;
  // // self.timerObj;

  self.display = function() {
    $( "#activityTimerText" ).text( ( self.milliseconds ).toHHMMSS() );
  };

  self.displayedTime = function() {};

  self.start = function() {
    self.milliseconds = 0;

    if ( self.timerObj ) window.clearInterval( self.timerObj );

    self.display();

    self.timerObj = setInterval( () => {

      self.milliseconds += self.INTERVAL;
      self.display();
    }, self.INTERVAL );
  };
};

var categoryVM = function( categories ) {
  var self = this;
  self.categoryList = categories;

  self.category = ko.observable();
  self.subcategory = ko.observable();
  self.notes = ko.observable();

  self.category.subscribe( () => {
    self.subcategory( undefined );
  } );
};

var activity = function( category, subcategory, duration ) {
  var self = this;
  self.category = category;
  self.subcategory = subcategory;
  self.duration = duration;

  self.categoryName = self.category.Description;
  self.subcategoryName = self.subcategory.Description;

  self.className = "categoryClass" + self.category.CategoryID;
};

var activityMonitorVM = function() {
  var self = this;
  self.activityList = new ko.observableArray();
  self.className = new ko.observable();
  self.teacherName = new ko.observable();

  self.addActivity = function( category, subcategory, duration ) {
    self.activityList.unshift( new activity( category, subcategory, duration ) );
  };

  self.clearActivities = function() {
    self.activityList( new Array() );
  };
};

var currentCategoryVM;
var currentActivityMonitorVM;

var currentActivityStartTime;


// For edit page
var currentActivityEditVM;
var activityEditVM = function() {
  var self = this; // Noted for reference
  self.categoryList = new Array();

  self.items = ko.observableArray( [] );
  self.updateActivity = function( item ) {
    var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );
    var x = currentActivityEditVM.items( );
    x[ item.submissionItemID() ] = item;
    currentActivityEditVM.items( x );

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
  };
};

var activityItemEdit = function( id, iid, c, sc, n, st, et, d, cl ) {
  var self = this;
  self.submissionID = ko.observable( id );
  self.submissionItemID = ko.observable( iid );
  self.category = ko.observable( c );
  self.subcategory = ko.observable( sc );
  self.notes = ko.observable( n );
  self.startTime = ko.observable( st );
  self.endTime = ko.observable( et );
  self.duration = ko.observable( d );
  self.categoryList = ko.observable( cl );

  self.dirtyCategory = ko.observable( c );
  self.dirtySubcategory = ko.observable( sc );
  self.dirtyNotes = ko.observable( n );

  self.isDirty = ko.computed( () => {
    return ( self.category() != self.dirtyCategory() ) || ( self.subcategory() != self
      .dirtySubcategory() ) || ( self.notes() != self.dirtyNotes() );
  } );

  self.category.subscribe( () => {
    self.subcategory( undefined );
  } );
};
// @FIXME
// window.onbeforeunload = function() {
//   return "You are about to exit the Classroom Time Analysis Tool.";
// };

$( document ).ready( () => {
  currentActivityTimer = new activityTimer();

  $.when( getCategories(), getCategories() )
    .then( c => {
      // bind categories
      currentCategoryVM = new categoryVM( c );
      ko.applyBindings( currentCategoryVM, $( "#observationEntryForm" )[ 0 ] );
      baseCategory = currentCategoryVM.category();
      
      currentActivityEditVM = new activityEditVM();
      ko.applyBindings( currentActivityEditVM, $( "#observationEditForm" )[ 0 ] );
      currentActivityEditVM.categoryList = c;
    } )
    .fail( () => {} );

  currentActivityMonitorVM = new activityMonitorVM();
  ko.applyBindings( currentActivityMonitorVM, $( "#activitySidebar" )[ 0 ] );
  $( "input" ).keypress( evt => {
    // Deterime where our character code is coming from within the event
    var charCode = evt.charCode || evt.keyCode;
    if ( charCode == 13 ) // Enter key's keycode
      return false;
  } );

  // Fetch cookie and set username
  pages = $.makeArray( $( ".page" ) );

  // Set constant
  LASTPAGEINDEX = pages.length - 1;

  $( ".popicon" ).each( function() {
    $( this ).popover();
  } );

  $( ".popicondown" ).each( function() {
    $( this ).popover( {
      placement: "bottom"
    } );
  } );

  $( "#poptimetracker" ).each( function() {
    $( this ).popover( {
      placement: "left"
    } );
  } );

  $( "#viewUserGuide" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    window.open( "Content/UserGuide.pdf", "ctatUserGuide" );
  } );

  $( "#endWelcome" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    $( "#landingWelcome" ).fadeOut( FADEINTERVAL, () => {
      if ( Object.keys( JSON.parse( localStorage.getItem( "Session" ) || "{}" ) ).length ) 
        $( "#landingMain" ).fadeIn( FADEINTERVAL );
      else {
        showWizard();

        $( "#observationEntryAlert, #observationEntryAlert2" ).hide();

        currentSubmissionVm.clearValues();
        currentActivityMonitorVM.clearActivities();
        currentActivityEditVM.items( [] );
        $( "#startObservationReady" ).fadeIn( FADEINTERVAL, () => {
          $( "#infoClass" ).focus();
        } );
      }      } );

  } );

  $( "#createNewSubmission" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();

    showWizard();

    $( "#observationEntryAlert, #observationEntryAlert2" ).hide();

    currentSubmissionVm.clearValues();
    currentActivityMonitorVM.clearActivities();
    currentActivityEditVM.items( [] );

    $( "#startObservationReady" ).fadeIn( FADEINTERVAL, () => {
      $( "#infoClass" ).focus();
    } );
  } );

  $( "#startObservation" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();

    $( "#preObservationEntry" ).fadeOut( FADEINTERVAL, () => {
      $( "#observationEntry" ).fadeIn( FADEINTERVAL );
      // note time to the millisecond
      currentActivityStartTime = new Date().getTime();
      currentActivityTimer.start();
    } );
  } );

  $( "#startObservationReady" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();

    var validClass = isValidRequiredField( "#infoClass" );
    var validTeacher = isValidRequiredField( "#infoTeacher" );
    var validTotalTime = isValidRequiredNumericField( "#infoTotalTime" );
    var validObserver = isValidRequiredField( "#infoObserver" );
    var validClassSize = isValidRequiredNumericField( "#infoClassSize" );

    var validPage = validClass && validTeacher && validTotalTime && validObserver &&
      validClassSize;
    if ( validPage ) {
      $( "#observationDetailsAlert" ).fadeOut( FADEINTERVAL );
      $( "#observationDetails" ).fadeOut( FADEINTERVAL );
      var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );
      temp[ currentSubmissionVm.SubmissionID() ] = JSON.parse( ko.mapping.toJSON( currentSubmissionVm ) );
      localStorage.setItem( "Session", JSON.stringify( temp ) );
      ko.mapping.fromJS( temp[ currentSubmissionVm.SubmissionID() ], {}, currentSubmissionVm );

      $( "#observationDetails" ).fadeOut( FADEINTERVAL, () => {
        currentActivityMonitorVM.className(
          currentSubmissionVm.Class() );
        currentActivityMonitorVM.teacherName(
          currentSubmissionVm.Teacher() );

        $( "#preObservationEntry" ).fadeIn( FADEINTERVAL );

        startNewActivity();
      } );

    } else

      $( "#observationDetailsAlert" ).fadeIn( FADEINTERVAL );

  } );

  $( "#enterActivity" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();

    if ( isPastActivitySubmissionThreshold() ) {
      // @FIXME
      var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );
      var x = temp[ currentSubmissionVm.SubmissionID() ]?.SubmissionItems || [];
      x.push( {
        CategoryID: currentCategoryVM.category().CategoryID,
        SubcategoryID: currentCategoryVM.subcategory().SubcategoryID,
        Description: currentCategoryVM.notes(),
        Duration: ( Math.round( ( new Date().getTime() - currentActivityStartTime ) / 1000 ) * 1000 ),
        StartTime: currentActivityStartTime,
        EndTime: new Date().getTime(),
      } );
      temp[ currentSubmissionVm.SubmissionID() ].SubmissionItems = x;
      localStorage.setItem( "Session", JSON.stringify( temp ) );
      
      currentActivityMonitorVM.addActivity( currentCategoryVM
        .category(), currentCategoryVM.subcategory(), moment( currentActivityTimer.milliseconds ).subtract( "minutes", new Date().getTimezoneOffset() ).format( "h:mm:ss" )/* this is time passed */ );

      // startNewActivity();

      // reset - note time to the millisecond
      currentActivityStartTime = new Date().getTime();

      currentCategoryVM.category( baseCategory );
      // $('#entryCategory')[0].selectedIndex = 0;
      currentCategoryVM.notes( "" );
      $( "#entryNotesStatus" ).html( "0" ).css( "color", "black" );

      // scroll to top
      $( "html, body" ).animate( {
        scrollTop: 0
      }, "fast" );
    }
  } );

  $( "#endObservation, #endObservation2" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();
    var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );
    var x = temp[ currentSubmissionVm.SubmissionID() ]?.SubmissionItems || [];
    x.push( {
      CategoryID: currentCategoryVM.category().CategoryID,
      SubcategoryID: currentCategoryVM.subcategory().SubcategoryID,
      Description: currentCategoryVM.notes(),
      Duration: ( Math.round( ( new Date().getTime() - currentActivityStartTime ) / 1000 ) * 1000 ),
      StartTime: currentActivityStartTime,
      EndTime: new Date().getTime(),
    } );
    temp[ currentSubmissionVm.SubmissionID() ].SubmissionItems = x;
    localStorage.setItem( "Session", JSON.stringify( temp ) );
    // Reset form
    currentCategoryVM.category( baseCategory );
    currentCategoryVM.notes( "" );
    $( "#entryNotesStatus" ).html( "0" ).css( "color", "black" );

    currentActivityEditVM.items(
      ko.utils.arrayMap( temp[ currentSubmissionVm.SubmissionID() ].SubmissionItems, item => {
        return new activityItemEdit(
          currentSubmissionVm.SubmissionID,
          item.SubmissionItemID,
          currentActivityEditVM.categoryList[ item.CategoryID - 1 ],
          _.find( currentActivityEditVM.categoryList[ item.CategoryID - 1 ].Subcategories,
            sc => { return sc.SubcategoryID == item.SubcategoryID; } ),
          item.Description,
          moment( item.StartTime ).format( "h:mm:ss A" ), // whatever this is.
          moment( item.EndTime ).format( "h:mm:ss A" ),
          item.Duration.toHHMMSS(),
          currentActivityEditVM.categoryList
        );
      } ) );

    // Set newly gened textareas
    var $targetfields = $(
      "#observationEditForm textarea[data-maxsize]"
    ); // get INPUTs and TEXTAREAs on page with "data-maxsize" attr defined
    setformfieldsize( $targetfields );

    $( "#observationEntry" ).fadeOut( FADEINTERVAL,
      () => {
        $( "#submissionPages" ).hide();
        $( "#observationEditForm" ).fadeIn(
          FADEINTERVAL );
      } );

    // currentSubmissionVm.
  } );

  $( "#finishEditing" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    $( "#observationEditForm" ).fadeOut( FADEINTERVAL, () => {
      $( "#submissionPages" ).hide();
      loadSubmissionsList();
      $( "#landing" ).fadeIn( FADEINTERVAL );
    } );
  } );

  // Prepare landing page with user's submissions
  initLanding();

  // Wireup other modal windows
  $( "#help" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    $( "#helpMessage" ).modal( "show" );
  } );

  $( "#about" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    $( "#aboutMessage" ).modal( "show" );
  } );

  $( "#home, #scenarioRow" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    saveVM();
    showLanding();
  } );

  // Wireup edit
  $( "#edit" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    saveVM();
    navigate( 1 );
  } );

  $( "#goSave, #saveMenu" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    saveVM();
    bootbox.alert( "School report saved!" );
  } );

  $( "#editProfile, #editProfileMenu" ).on( "click", e => {

    // But allow propogation to let menu close
    e.preventDefault();


    // Means that the user is currently editing a scenario
    if ( $( "#landing" ).is( ":hidden" ) && $( "#userInformation" ).is( ":hidden" ) )
      saveVM();


    showUserInformation();
  } );

  $( "#submitScenario" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    currentVm.IsSubmitted = true;
    saveVM();
    bootbox.dialog( "Thank you for your time and participation!", {
      "label": "OK",
      "class": "btn-success",
      "callback": function() {
        showLanding();
      }
    } );
  } );

  $( "#standardStartTime, #standardEndTime" )
    .timeEntry( {
      ampmPrefix: " ",
      beforeShow: timeRangeStandard
    } );

  $( "#erStartTime, #erEndTime" )
    .timeEntry( {
      ampmPrefix: " ",
      beforeShow: timeRangeER
    } );

  appViewModel.prototype.toJSON = function() {
    var copy = ko.toJS( this ); // just a quick way to get a clean copy
    copy.D5 = copy.D5.toString( "hh:mm tt" );
    copy.D6 = copy.D6.toString( "hh:mm tt" );
    copy.D10 = copy.D10.toString( "hh:mm tt" );
    copy.D11 = copy.D11.toString( "hh:mm tt" );
    return copy;
  };

  ko.bindingHandlers.timePicker = {
    "init": function( element, valueAccessor, allBindingsAccessor ) {
      /* initialize datepicker with some optional options*/
      var options = allBindingsAccessor().jqDatePickerOptions || {},
        prop = valueAccessor(),
        $elem = $( element );
      ko.utils.registerEventHandler( element, "change", () => {
        prop( $elem.timeEntry( "getTime" ) );
      } );

      /* handle disposal (if KO removes by the template binding)*/
      ko.utils.domNodeDisposal.addDisposeCallback( element, () => {
        $elem.datepicker( "destroy" );
      } );

    },
    "update": function( element, valueAccessor ) {
      var value = ko.utils.unwrapObservable( valueAccessor() ),
        $elem = $( element ),
        current = $elem.timeEntry( "getTime" );
      $elem.timeEntry( "setTime", value );
    }
  };

  ko.numericObservable = function( initialValue ) {
    var _actual = ko.observable( initialValue );

    var result = ko.dependentObservable( {
      read: function() {
        return _actual();
      },
      write: function( newValue ) {
        // Do not allow negative numbers
        if ( !isNaN( newValue ) )
          newValue = Math.abs( newValue );
        var parsedValue = parseFloat( newValue );
        _actual( isNaN( parsedValue ) ? 0 : Math.abs( parsedValue ) );
      }
    } );
    return result;
  };

  currentSubmissionVm = new submissionViewModel();
  ko.applyBindings( currentSubmissionVm, $( "#observationDetails" )[ 0 ] );
} );



function showWizard() {

  _gaq.push( [ "_trackEvent", "Navigation", "Step 1" ] );

  $( "#userInformation" ).fadeOut( FADEINTERVAL );
  $( "#landing" ).fadeOut( FADEINTERVAL, () => {
    // Show the first page
    $( pages[ FIRSTPAGEINDEX ] ).fadeIn( FADEINTERVAL );

    var fadeInCount = 0;
    $( "#infoSidebar, #submissionPages, #sectionsContainer" ).fadeIn( FADEINTERVAL, () => {
      if ( ++fadeInCount == 3 ) {
        // Show the first panel
        $( "#panel1" ).show();
        $( "#panel2" ).hide();

        // Show the next button for the first page
        $( "#goNext, #goSave" ).show();
        $( "#goBack" ).hide();

        // Set the current page to the first page
        currentPageIndex = FIRSTPAGEINDEX;

        $( "#goBackMenu" ).addClass( "disabled" );
        $( "#goNextMenu, #saveMenu, #home" ).removeClass( "disabled" );

        // Make certain section one is highlighted when starting up
        setSection( 1 );

        setTimeout( () => {
          $( pages[ FIRSTPAGEINDEX ] ).find( "input.defaultfocus" ).focus();
        }, 200 );
      }
    } );

  } );


}

function showLanding() {

  _gaq.push( [ "_trackEvent", "Navigation", "School Report Landing" ] );
  $( pages[ currentPageIndex ] ).fadeOut( FADEINTERVAL );

  var fadeOutCount = 0;
  $( "#submissionPages, #sectionsContainer, #landing" ).fadeOut( FADEINTERVAL, () => {
    if ( ++fadeOutCount == 3 ) {
      loadSubmissionsList();
      $( "#landing" ).fadeIn( FADEINTERVAL, () => {
        $( "#goBackMenu, #goNextMenu, #saveMenu" ).addClass( "disabled" );
        $( "#home" ).removeClass( "disabled" );
      } );
    }

  } );
}

function showUserInformation() {

  _gaq.push( [ "_trackEvent", "Navigation", "Profile Edit" ] );

  // Fade out current page
  $( pages[ currentPageIndex ] ).fadeOut( FADEINTERVAL );

  var fadeOutCount = 0;
  $( "#submissionPages, #sectionsContainer, #landing, #needProfile" ).fadeOut( FADEINTERVAL, () => {

    if ( ++fadeOutCount == 4 )
      $( "#userInformation" ).fadeIn( FADEINTERVAL, () => {
        $( "#goBackMenu, #goNextMenu, #saveMenu, #home" ).addClass( "disabled" );
        $( "#infoName" ).select();
      } );

  } );
}

function initLanding() {
  $( "#goBackMenu, #goNextMenu, #saveMenu" ).addClass( "disabled" );
  $( pages[ currentPageIndex ] ).hide();
  currentSubmissionsList = new submissionsModel();
  loadSubmissionsList();
  ko.applyBindings( currentSubmissionsList, document.getElementById( "landing" ) );
  setTimeout( () => {
    $( "#landingTable" ).fadeIn( FADEINTERVAL );
  }, FADEINTERVAL );
}

function loadSubmissionsList() {
  var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );
  currentSubmissionsList.submissions(
    ko.utils.arrayMap( Object.keys( temp ), submission => {
      return {
        submissionID: temp[ submission ].SubmissionID,
        name: `${temp[ submission ].Teacher} - ${temp[ submission ].Class}`,
        isSubmitted: temp[ submission ].IsSubmitted,
        lastUpdated: temp[ submission ].LastUpdated
      };
    } ) );
}

/*
function loadVM( vmID ) {
  $.ajax( {
    url: "api/Submission/" + vmID,
    type: "GET",
    contentType: "application/json;charset=utf-8",
    statusCode: {
      200: function( data ) {

        // ko.mapping.fromJSON(data, currentVm);
        currentVm.SubmissionID( data.SubmissionID );
        currentVm.Name( data.Name );
        currentVm.IsSubmitted( data.IsSubmitted );
        currentVm.LastUpdated( Date.parse( data.LastUpdated ) );

        currentVm.Phone( data.Phone );
        currentVm.SchoolName( data.SchoolName );
        currentVm.StreetAddress( data.StreetAddress );
        currentVm.City( data.City );
        currentVm.State( data.State );
        currentVm.Zip( data.Zip );

        currentVm.GradeECE( data.GradeECE );
        currentVm.GradeK( data.GradeK );
        currentVm.Grade1( data.Grade1 );
        currentVm.Grade2( data.Grade2 );
        currentVm.Grade3( data.Grade3 );
        currentVm.Grade4( data.Grade4 );
        currentVm.Grade5( data.Grade5 );
        currentVm.Grade6( data.Grade6 );
        currentVm.Grade7( data.Grade7 );
        currentVm.Grade8( data.Grade8 );
        currentVm.Grade9( data.Grade9 );
        currentVm.Grade10( data.Grade10 );
        currentVm.Grade11( data.Grade11 );
        currentVm.Grade12( data.Grade12 );

        currentVm.D5( Date.parse( data.D5 ) );
        currentVm.D6( Date.parse( data.D6 ) );
        currentVm.D10( Date.parse( data.D10 ) );
        currentVm.D11( Date.parse( data.D11 ) );

        currentVm.PeriodsPerDayStd( data.PeriodsPerDayStd );
        currentVm.MinutesPerPeriodStd( data.MinutesPerPeriodStd );
        currentVm.PeriodsPerDayEr( data.PeriodsPerDayEr );
        currentVm.MinutesPerPeriodEr( data.MinutesPerPeriodEr );


        currentVm.D8( data.D8 );
        currentVm.D13( data.D13 );
        currentVm.D16( data.D16 );
        currentVm.D17( data.D17 );

        currentVm.C23( data.C23 );
        currentVm.C24( data.C24 );
        currentVm.C25( data.C25 );
        currentVm.C26( data.C26 );
        currentVm.C27( data.C27 );
        currentVm.C28( data.C28 );
        currentVm.C28text( data.C28text );
        currentVm.C30( data.C30 );
        currentVm.C31( data.C31 );
        currentVm.C32( data.C32 );
        currentVm.C33( data.C33 );
        currentVm.C33text( data.C33text );

        currentVm.G23( data.G23 );
        currentVm.G24( data.G24 );
        currentVm.G25( data.G25 );
        currentVm.G26( data.G26 );
        currentVm.G27( data.G27 );
        currentVm.G27text( data.G27text );
        currentVm.G28( data.G28 );
        currentVm.G28text( data.G28text );
        currentVm.G30( data.G30 );
        currentVm.G31( data.G31 );
        currentVm.G32( data.G32 );
        currentVm.G32text( data.G32text );

        currentVm.K22( data.K22 );
        currentVm.K23( data.K23 );
        currentVm.K24( data.K24 );
        currentVm.K25( data.K25 );
        currentVm.K26( data.K26 );
        currentVm.K26text( data.K26text );
        currentVm.K27( data.K27 );
        currentVm.K27text( data.K27text );

        currentVm.C42( data.C42 );
        currentVm.C43( data.C43 );
        currentVm.C44( data.C44 );

        currentVm.G42( data.G42 );
        currentVm.G43( data.G43 );
        currentVm.G44( data.G44 );

        currentVm.G51( data.G51 );
        currentVm.G52( data.G52 );
        currentVm.G53( data.G53 );

        currentVm.K51( data.K51 );
        currentVm.K52( data.K52 );
        currentVm.K53( data.K53 );
        currentVm.K54( data.K54 );
        currentVm.K55( data.K55 );

        // document.write(ko.toJSON(currentVm));
      },
      404: function() {
        // load failed
      }
    }
  } );
}
*/

function saveVM() {
  var temp = JSON.parse( localStorage.getItem( "Session" ) );
  temp[ currentVm.SubmissionID() ] = JSON.parse( ko.toJSON( currentVm ) );
  localStorage.setItem( "Session", JSON.stringify( temp ) );
}

function timeRangeStandard( input ) {
  return {
    minTime: ( input.id == "standardEndTime" ? $( "#standardStartTime" ).timeEntry( "getTime" ) : null ),
    maxTime: ( input.id == "standardStartTime" ? $( "#standardEndTime" ).timeEntry( "getTime" ) : null )
  };
}

function timeRangeER( input ) {
  return {
    minTime: ( input.id == "erEndTime" ? $( "#erStartTime" ).timeEntry( "getTime" ) : null ),
    maxTime: ( input.id == "erStartTime" ? $( "#erEndTime" ).timeEntry( "getTime" ) : null )
  };
}

function createChart() {
  $( "#weeklyChart" ).html( "" );
  var weeklyChart = null;
  weeklyChart = new Highcharts.Chart( {
    chart: {
      renderTo: "weeklyChart",
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false
    },
    title: {
      text: "Weekly Minutes"
    },
    tooltip: {
      percentageDecimals: 1
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: false
        },
        showInLegend: true
      }
    },
    series: [ {
      type: "pie",
      name: "Time spent",
      data: [ {
        name: "Academics / Academic Support",
        y: Math.round( currentVm.D64() * 10 ) / 10,
        sliced: true,
        selected: true,
        color: "#660066"
      },
      {
        name: "Specials / Electives",
        y: Math.round( currentVm.H64() * 10 ) / 10,
        color: "#6E8890"
      },
      {
        name: "Other",
        y: Math.round( currentVm.L64() * 10 ) / 10,
        color: "#7F866C"
      }
      ]
    } ]
  } );

  $( "#annualChart" ).html( "" );
  var annualChart = null;
  annualChart = new Highcharts.Chart( {
    chart: {
      renderTo: "annualChart",
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false
    },
    title: {
      text: "Annual Hours"
    },
    tooltip: {
      percentageDecimals: 1
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: false
        },
        showInLegend: true
      }
    },
    series: [ {
      type: "pie",
      name: "Time spent",
      data: [ {
        name: "Academics / Academic Support",
        y: Math.round( currentVm.D68() * 10 ) / 10,
        sliced: true,
        selected: true,
        color: "#660066"
      },
      {
        name: "Specials / Electives",
        y: Math.round( currentVm.H68() * 10 ) / 10,
        color: "#6E8890"
      },
      {
        name: "Other",
        y: Math.round( currentVm.L68() * 10 ) / 10,
        color: "#7F866C"
      }
      ]
    } ]
  } );
}

/*
function step( direction ) {
  // Navigation not allowed out of bound on first or last page
  if ( ( currentPageIndex == FIRSTPAGEINDEX && direction == -1 ) || ( currentPageIndex == LASTPAGEINDEX &&
      direction == 1 ) ) return false;

  // Determine next page index based on direction (either 1 or -1)
  var newPageIndex = currentPageIndex + direction;
  navigate( newPageIndex );
}

function goToPage( pageID ) {
  var pageIndex;
  $.each( pages, function( index, value ) {
    if ( $( this ).attr( "id" ) == pageID )
      pageIndex = index;
  } );
  navigate( pageIndex );
}
*/

function isPageOneValid() {
  var isValid = true;
  isValid = !(
    $.trim( currentVm.Phone() ).length == 0 ||
    $.trim( currentVm.SchoolName() ).length == 0 ||
    $.trim( currentVm.StreetAddress() ).length == 0 ||
    $.trim( currentVm.City() ).length == 0 ||
    $.trim( currentVm.State() ).length == 0 ||
    $.trim( currentVm.Zip() ).length == 0 ||
    (
      !currentVm.GradeECE() &&
      !currentVm.GradeK() &&
      !currentVm.Grade1() &&
      !currentVm.Grade2() &&
      !currentVm.Grade3() &&
      !currentVm.Grade4() &&
      !currentVm.Grade5() &&
      !currentVm.Grade6() &&
      !currentVm.Grade7() &&
      !currentVm.Grade8() &&
      !currentVm.Grade9() &&
      !currentVm.Grade10() &&
      !currentVm.Grade11() &&
      !currentVm.Grade12()
    )
  );
  return isValid;
}

function navigate( newPageIndex ) {
  saveVM();

  // Don't navigate from page 1 unless valid...unless going back to first page
  if ( currentPageIndex == 0 )
    if ( !isPageOneValid() ) {
      $( "#schoolReportDetails div.alert" ).fadeIn( FADEINTERVAL );
      return false;
    } else
      $( "#schoolReportDetails div.alert" ).fadeOut( FADEINTERVAL );
  // Fade out both buttons with page
  $( "#goBack, #goNext, #goSave" ).fadeOut( FADEINTERVAL );

  // If designated sidebar is going to change, fade out
  if (
    ( $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel1" && $( pages[ currentPageIndex ] ).data(
      "sidebar" ) == "panel2" ) ||
    ( $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel2" && $( pages[ currentPageIndex ] ).data(
      "sidebar" ) == "panel1" )
  ) $( ".panel" ).fadeOut( FADEINTERVAL );

  // Fade out current page
  $( pages[ currentPageIndex ] ).fadeOut( FADEINTERVAL, () => {

    // Change nav options for Back based on availability
    if ( newPageIndex != FIRSTPAGEINDEX ) {
      $( "#goBack" ).fadeIn( FADEINTERVAL );
      $( "#goBackMenu" ).removeClass( "disabled" );
    } else
      $( "#goBackMenu" ).addClass( "disabled" );


    // Change nave options for Next based on availability
    if ( newPageIndex != LASTPAGEINDEX ) {
      $( "#goNext" ).fadeIn( FADEINTERVAL );
      $( "#goNextMenu" ).removeClass( "disabled" );
    } else
      $( "#goNextMenu" ).addClass( "disabled" );


    $( "#goSave" ).fadeIn( FADEINTERVAL );

    // Fade in panels
    if ( $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel1" && !$( "#panel1" ).is(
      ":visible" ) ) $( "#panel1" ).fadeIn( FADEINTERVAL );
    if ( $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel2" && !$( "#panel2" ).is(
      ":visible" ) ) $( "#panel2" ).fadeIn( FADEINTERVAL );

    // Fade in new page
    // Create/update charts when new page is analysis - after page show
    if ( newPageIndex == 0 ) // ANALYSISPAGEINDEX
      $( pages[ newPageIndex ] ).fadeIn( FADEINTERVAL, createChart );
    else
      $( pages[ newPageIndex ] ).fadeIn( FADEINTERVAL );




    // Set page to top of scroll
    window.scrollTo( 0, 0 );

    // Highlight proper transfer section
    setSection( $( pages[ newPageIndex ] ).attr( "data-section" ) );


    $( pages[ newPageIndex ] ).find( "input.defaultfocus" ).focus().select();
  } );

  _gaq.push( [ "_trackEvent", "Navigation", $( pages[ newPageIndex ] ).attr( "data-description" ) ] );

  // Set current page to be the new page
  currentPageIndex = newPageIndex;

}

function setSection( sectionID ) {
  $( "#sections li" ).removeClass( "active" );
  $( "#sections li[data-section=\"" + sectionID + "\"]" ).addClass( "active" );
}

function displayTime( date ) {
  var hours = ( date.getHours() > 12 ) ? date.getHours() - 12 : date.getHours();
  var minutes = ( date.getMinutes() > 9 ) ? date.getMinutes().toString() : "0" + date.getMinutes().toString();
  var period = ( date.getHours() > 12 ) ? "PM" : "AM";
  return hours + ":" + minutes + "\xA0" + period;
}

function displayNumberPct( number ) {
  return displayNumber( number, 1, "% allocated time" );
}

function displayNumber( number, decimalPlaces, suffix ) {
  if ( decimalPlaces == undefined ) decimalPlaces = 0;
  var value = parseFloat( number );
  if ( isNaN( value ) ) value = 0;
  return ( suffix == undefined ) ? value.toFixed( decimalPlaces ) : value.toFixed( decimalPlaces ) + suffix;
}

function parseNvPairString( qs ) {
  var nvpair = {};
  var pairs = qs.split( "&" );
  $.each( pairs, ( i, v ) => {
    var pair = v.split( "=" );
    nvpair[ pair[ 0 ] ] = pair[ 1 ];
  } );
  return nvpair;
}

function getTimeStamp() {
  var currentDate = new Date();
  var currentTime = currentDate.getTime();
  var localOffset = ( -1 ) * currentDate.getTimezoneOffset() * 60000;
  var stamp = Math.round( new Date( currentTime + localOffset ).getTime() / 1000 );
  return stamp;
}

// function nctlUserViewModel() {
//    var self = this;

//    self.EmailAddress = ko.observable();
//    self.Name = ko.observable();
//    self.Phone = ko.observable();
//    self.SchoolName = ko.observable();
//    self.StreetAddress = ko.observable();
//    self.City = ko.observable();
//    self.State = ko.observable();
//    self.Zip = ko.observable();
//    self.LastLogin = ko.observable();
// }

function appViewModel() {

  var self = this;
  self.SubmissionID = ko.observable();
  self.Name = ko.observable();
  self.IsSubmitted = ko.observable();
  self.LastUpdated = ko.observable();

  self.Phone = ko.observable();
  self.SchoolName = ko.observable();
  self.StreetAddress = ko.observable();
  self.City = ko.observable();
  self.State = ko.observable();
  self.Zip = ko.observable();

  self.GradeECE = ko.observable();
  self.GradeK = ko.observable();
  self.Grade1 = ko.observable();
  self.Grade2 = ko.observable();
  self.Grade3 = ko.observable();
  self.Grade4 = ko.observable();
  self.Grade5 = ko.observable();
  self.Grade6 = ko.observable();
  self.Grade7 = ko.observable();
  self.Grade8 = ko.observable();
  self.Grade9 = ko.observable();
  self.Grade10 = ko.observable();
  self.Grade11 = ko.observable();
  self.Grade12 = ko.observable();


  // SECTION 1
  self.D5 = ko.observable( new Date( 1, 1, 1, 8, 0, 0, 0 ) );
  self.D6 = ko.observable( new Date( 1, 1, 1, 15, 0, 0, 0 ) );
  self.D8 = ko.numericObservable( 0 );

  self.D10 = ko.observable( new Date( 1, 1, 1, 8, 0, 0, 0 ) );
  self.D11 = ko.observable( new Date( 1, 1, 1, 15, 0, 0, 0 ) );
  self.D13 = ko.numericObservable( 0 );
  self.D16 = ko.numericObservable( 0 );
  self.D17 = ko.numericObservable( 0 );

  self.PeriodsPerDayStd = ko.numericObservable( 0 );
  self.MinutesPerPeriodStd = ko.numericObservable( 0 );
  self.PeriodsPerDayEr = ko.numericObservable( 0 );
  self.MinutesPerPeriodEr = ko.numericObservable( 0 );

  self.G8 = ko.computed( () => {
    return ( ( self.D6().getHours() - self.D5().getHours() ) * 60 ) + ( self.D6().getMinutes() -
      self.D5().getMinutes() );
  } );

  self.G13 = ko.computed( () => {
    return ( ( self.D11().getHours() - self.D10().getHours() ) * 60 ) + ( self.D11().getMinutes() -
      self.D10().getMinutes() );
  } );

  self.G15 = ko.computed( () => {
    return ( self.G8() * self.D8() ) + ( self.G13() * self.D13() );
  } );

  self.G17 = ko.computed( () => {
    return ( ( self.D16() * self.G8() ) + ( self.D17() * self.G13() ) ) / 60;
  } );


  // SECTION 2 - Academics / Academic Support
  self.C23 = ko.numericObservable( 0 );
  self.C24 = ko.numericObservable( 0 );
  self.C25 = ko.numericObservable( 0 );
  self.C26 = ko.numericObservable( 0 );
  self.C27 = ko.numericObservable( 0 );
  self.C28 = ko.numericObservable( 0 );
  self.C28text = ko.observable( "Other" );

  self.C30 = ko.numericObservable( 0 );
  self.C31 = ko.numericObservable( 0 );
  self.C32 = ko.numericObservable( 0 );
  self.C33 = ko.numericObservable( 0 );
  self.C33text = ko.observable( "Other" );

  self.D23 = ko.computed( () => {
    return self.C23() / self.G15() * 100;
  } );

  self.D24 = ko.computed( () => {
    return self.C24() / self.G15() * 100;
  } );

  self.D25 = ko.computed( () => {
    return self.C25() / self.G15() * 100;
  } );

  self.D26 = ko.computed( () => {
    return self.C26() / self.G15() * 100;
  } );

  self.D27 = ko.computed( () => {
    return self.C27() / self.G15() * 100;
  } );

  self.D28 = ko.computed( () => {
    return self.C28() / self.G15() * 100;
  } );


  self.D30 = ko.computed( () => {
    return self.C30() / self.G15() * 100;
  } );

  self.D31 = ko.computed( () => {
    return self.C31() / self.G15() * 100;
  } );

  self.D32 = ko.computed( () => {
    return self.C32() / self.G15() * 100;
  } );

  self.D33 = ko.computed( () => {
    return self.C33() / self.G15() * 100;
  } );

  // SECTION 2 - Academics / Academic Support - Rollups
  self.C22 = ko.computed( () => {
    return self.C23() + self.C24() + self.C25() + self.C26() + self.C27() + self.C28();
  } );

  self.D22 = ko.computed( () => {
    return self.C22() / self.G15() * 100;
  } );

  self.C29 = ko.computed( () => {
    return self.C30() + self.C31() + self.C32() + self.C33();
  } );

  self.D29 = ko.computed( () => {
    return self.C29() / self.G15() * 100;
  } );

  self.C35 = ko.computed( () => {
    return self.C29() + self.C22();
  } );

  self.C36 = ko.computed( () => {
    return self.C35() / 60;
  } );

  self.D35 = ko.computed( () => {
    return self.C35() / self.G15() * 100;
  } );

  self.C37 = ko.computed( () => {
    return ( self.D35() * self.G17() ) / self.D16() / 100;
  } );

  // SECTION 2 - Non-Core Academic
  self.G23 = ko.numericObservable( 0 );
  self.G24 = ko.numericObservable( 0 );
  self.G25 = ko.numericObservable( 0 );
  self.G26 = ko.numericObservable( 0 );
  self.G27 = ko.numericObservable( 0 );
  self.G27text = ko.observable( "Other" );
  self.G28 = ko.numericObservable( 0 );
  self.G28text = ko.observable( "Other" );

  self.G30 = ko.numericObservable( 0 );
  self.G31 = ko.numericObservable( 0 );
  self.G32 = ko.numericObservable( 0 );
  self.G32text = ko.observable( "Other" );

  self.H23 = ko.computed( () => {
    return self.G23() / self.G15() * 100;
  } );

  self.H24 = ko.computed( () => {
    return self.G24() / self.G15() * 100;
  } );

  self.H25 = ko.computed( () => {
    return self.G25() / self.G15() * 100;
  } );

  self.H26 = ko.computed( () => {
    return self.G26() / self.G15() * 100;
  } );

  self.H27 = ko.computed( () => {
    return self.G27() / self.G15() * 100;
  } );

  self.H28 = ko.computed( () => {
    return self.G28() / self.G15() * 100;
  } );


  self.H30 = ko.computed( () => {
    return self.G30() / self.G15() * 100;
  } );

  self.H31 = ko.computed( () => {
    return self.G31() / self.G15() * 100;
  } );

  self.H32 = ko.computed( () => {
    return self.G32() / self.G15() * 100;
  } );

  // SECTION 2 - Non-Core Academic - Rollups
  self.G22 = ko.computed( () => {
    return self.G23() + self.G24() + self.G25() + self.G26() + self.G27() + self.G28();
  } );

  self.H22 = ko.computed( () => {
    return self.G22() / self.G15() * 100;
  } );

  self.G29 = ko.computed( () => {
    return self.G30() + self.G31() + self.G32();
  } );

  self.H29 = ko.computed( () => {
    return self.G29() / self.G15() * 100;
  } );

  self.G35 = ko.computed( () => {
    return self.G29() + self.G22();
  } );

  self.G36 = ko.computed( () => {
    return self.G35() / 60;
  } );

  self.H35 = ko.computed( () => {
    return self.G35() / self.G15() * 100;
  } );

  self.G37 = ko.computed( () => {
    return ( self.H35() * self.G17() ) / self.D16() / 100;
  } );

  // SECTION 2 - Other
  self.K22 = ko.numericObservable( 0 );
  self.K23 = ko.numericObservable( 0 );
  self.K24 = ko.numericObservable( 0 );
  self.K25 = ko.numericObservable( 0 );
  self.K26 = ko.numericObservable( 0 );
  self.K26text = ko.observable( "Other" );
  self.K27 = ko.numericObservable( 0 );
  self.K27text = ko.observable( "Other" );

  self.L22 = ko.computed( () => {
    return self.K22() / self.G15() * 100;
  } );

  self.L23 = ko.computed( () => {
    return self.K23() / self.G15() * 100;
  } );

  self.L24 = ko.computed( () => {
    return self.K24() / self.G15() * 100;
  } );

  self.L25 = ko.computed( () => {
    return self.K25() / self.G15() * 100;
  } );

  self.L26 = ko.computed( () => {
    return self.K26() / self.G15() * 100;
  } );

  self.L27 = ko.computed( () => {
    return self.K27() / self.G15() * 100;
  } );


  // SECTION 2 - Other - Rollups
  self.K35 = ko.computed( () => {
    return self.K22() + self.K23() + self.K24() + self.K25() + self.K26() + self.K27();
  } );

  self.K36 = ko.computed( () => {
    return self.K35() / 60;
  } );

  self.L35 = ko.computed( () => {
    return self.K35() / self.G15() * 100;
  } );

  self.K37 = ko.computed( () => {
    return ( self.L35() * self.G17() ) / self.D16() / 100;
  } );


  // SECTION 3 - Academics / Academic Support
  self.C42 = ko.numericObservable( 0 );
  self.C43 = ko.numericObservable( 0 );
  self.C44 = ko.numericObservable( 0 );

  self.D42 = ko.computed( () => {
    return self.C42() / self.G15() * 100;
  } );

  self.D43 = ko.computed( () => {
    return self.C43() / self.G15() * 100;
  } );

  self.D44 = ko.computed( () => {
    return self.C44() / self.G15() * 100;
  } );

  self.C46 = ko.computed( () => {
    return self.C42() + self.C43() + self.C44();
  } );

  self.C46hours = ko.computed( () => {
    return self.C46() / 60;
  } );

  self.D46 = ko.computed( () => {
    return self.C46() / self.G15() * 100;
  } );

  // SECTION 3 - Non-Core Academic
  self.G42 = ko.numericObservable( 0 );
  self.G43 = ko.numericObservable( 0 );
  self.G44 = ko.numericObservable( 0 );

  self.H42 = ko.computed( () => {
    return self.G42() / self.G15() * 100;
  } );

  self.H43 = ko.computed( () => {
    return self.G43() / self.G15() * 100;
  } );

  self.H44 = ko.computed( () => {
    return self.G44() / self.G15() * 100;
  } );

  self.G46 = ko.computed( () => {
    return self.G42() + self.G43() + self.G44();
  } );

  self.G46hours = ko.computed( () => {
    return self.G46() / 60;
  } );

  self.H46 = ko.computed( () => {
    return self.G46() / self.G15() * 100;
  } );

  // SECTION 4 - Academics / Academic Support


  // SECTION 4 - Non-Core Academic
  self.G51 = ko.numericObservable( 0 );
  self.G52 = ko.numericObservable( 0 );
  self.G53 = ko.numericObservable( 0 );

  self.H51 = ko.computed( () => {
    return self.G51() / self.G17() * 100;
  } );

  self.H52 = ko.computed( () => {
    return self.G52() / self.G17() * 100;
  } );

  self.H53 = ko.computed( () => {
    return self.G53() / self.G17() * 100;
  } );

  self.G57 = ko.computed( () => {
    return self.G51() + self.G52() + self.G53();
  } );

  self.H57 = ko.computed( () => {
    return self.G57() / self.G17() * 100;
  } );



  // SECTION 4 - Other
  self.K51 = ko.numericObservable( 0 );
  self.K52 = ko.numericObservable( 0 );
  self.K53 = ko.numericObservable( 0 );
  self.K54 = ko.numericObservable( 0 );
  self.K55 = ko.numericObservable( 0 );

  self.L51 = ko.computed( () => {
    return self.K51() / self.G17() * 100;
  } );

  self.L52 = ko.computed( () => {
    return self.K52() / self.G17() * 100;
  } );

  self.L53 = ko.computed( () => {
    return self.K53() / self.G17() * 100;
  } );

  self.L54 = ko.computed( () => {
    return self.K54() / self.G17() * 100;
  } );

  self.L55 = ko.computed( () => {
    return self.K55() / self.G17() * 100;
  } );

  self.K57 = ko.computed( () => {
    return self.K51() + self.K52() + self.K53() + self.K54() + self.K55();
  } );

  self.L57 = ko.computed( () => {
    return self.K57() / self.G17() * 100;
  } );


  // SECTION 4 - Rollups - Order is important, referencing prior equations
  self.K59 = ko.computed( () => {
    return ( self.L35() / 100 * self.G17() ) + self.K57() + ( self.K57() * self.L35() /
      100 ); // removed '- self.C57()', no cell equation
  } );

  self.L59 = ko.computed( () => {
    return self.K59() / self.G17() * 100;
  } );

  self.G59 = ko.computed( () => {
    return ( self.H35() / 100 * self.G17() ) - ( self.K57() * self.H35() / 100 ) - ( self.K57() *
      self.L35() / 100 ) + self.G57(); // H37 changed to H35
  } );

  self.H59 = ko.computed( () => {
    return self.G59() / self.G17() * 100;
  } );

  self.C59 = ko.computed( () => {
    return ( self.D35() / 100 * self.G17() ) - ( self.K57() * self.D35() / 100 ) - ( self.K57() *
      self.L35() / 100 ) - self.G57(); // D37 changed to D35
  } );

  self.D59 = ko.computed( () => {
    return self.C59() / self.G17() * 100;
  } );


  // SECTION 5 - Analysis
  self.D64 = ko.computed( () => {
    return self.C35() - self.C46();
  } );

  self.D65 = ko.computed( () => {
    return self.D64() / self.G15() * 100;
  } );

  self.H64 = ko.computed( () => {
    return self.G35() - self.G42() - self.G43();
  } );

  self.H65 = ko.computed( () => {
    return self.H64() / self.G15() * 100;
  } );

  self.L64 = ko.computed( () => {
    return self.K35() + self.C42() + self.C43() + self.G42() + self.G43();
  } );

  self.L65 = ko.computed( () => {
    return self.L64() / self.G15() * 100;
  } );

  self.D68 = ko.computed( () => {
    return self.C59() - ( self.D46() / 100 * self.C59() );
  } );

  self.D69 = ko.computed( () => {
    return self.D68() / self.G17() * 100;
  } );

  self.H68 = ko.computed( () => {
    return self.G59() - ( self.H46() / 100 * self.G59() );
  } );

  self.H69 = ko.computed( () => {
    return self.H68() / self.G17() * 100;
  } );

  self.L68 = ko.computed( () => {
    return self.K59() + ( self.H46() / 100 * self.G59() ) + ( self.D46() / 100 * self.C59() );
  } );

  self.L69 = ko.computed( () => {
    return self.L68() / self.G17() * 100;
  } );

  // SECTION 1 - rollup
  self.J17 = ko.computed( () => {
    return self.G15() - ( self.C35() + self.G35() + self.K35() );
  } );
}

function submissionsModel() {
  var self = this;
  self.submissions = ko.observableArray( [] );

  self.removeSubmission = function( submission ) {
    // e.preventDefault();
    bootbox.confirm( "Are you sure you want to delete observation \"" + submission.name + "\"?",
      confirmed => {
        if ( confirmed ) {
          var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );
          delete temp[ submission.submissionID ];
          localStorage.setItem( "Session", JSON.stringify( temp ) );
          loadSubmissionsList();
        }
      } );
  };

  self.editSubmission = function( submission ) {
    loadSubmission( submission.submissionID );
  };

  self.viewSubmission = function( submission ) {
    window.open( "Document.aspx?ID=" + submission.submissionID + "&offset=" + new Date()
      .getTimezoneOffset() / 60 );
    return false;
  };
}

function submissionViewModel() {
  var self = this;
  self.SubmissionID = ko.observable();
  self.Class = ko.observable();
  self.Teacher = ko.observable();
  self.ClassDuration = ko.numericObservable( 0 );
  self.Observer = ko.observable();
  self.ClassSize = ko.numericObservable( 0 );
  self.StartTime = ko.observable();
  self.EndTime = ko.observable();
  self.LastUpdated = ko.observable();
  self.IsSubmitted = ko.observable();
  self.SubmissionItems = ko.observable();

  self.clearValues = function() {
    // @FIXME
    self.SubmissionID( Math.round( Math.random() * 5000 ) );
    self.Class( "CLASS" );
    self.Teacher( "TEACHER" );
    self.ClassDuration( 4 );
    self.Observer( "OBSERVER" );
    self.ClassSize( 4 );
    self.StartTime( new Date().toISOString() ); /* new moment( new Date().getTime() ).format( "h:mm:ss A" ) */ 
    self.EndTime( undefined );
    self.LastUpdated( new Date().toISOString() );
    self.IsSubmitted( "SUBMITTED" );
    self.SubmissionItems( [] );
  };
}

function isValidRequiredField( fieldReference ) {
  var field = $( fieldReference );
  var fieldValue = $.trim( field.val() );
  if ( fieldValue.length == 0 ) {
    field.closest( ".control-group" ).addClass( "error" );
    field.parent().find( "span.help-inline" ).html( "This is a required field" );
  } else {
    field.closest( ".control-group" ).removeClass( "error" );
    field.parent().find( "span.help-inline" ).html( "" );
  }

  return fieldValue.length > 0;
}

function isValidRequiredDropdown( fieldReference ) {
  var field = $( fieldReference + " option:selected" );
  var fieldValue = $.trim( field.val() );
  if ( fieldValue.length == 0 ) {
    field.closest( ".control-group" ).addClass( "error" );
    field.parent().find( "span.help-inline" ).html( "This is a required field" );
  } else {
    field.closest( ".control-group" ).removeClass( "error" );
    field.parent().find( "span.help-inline" ).html( "" );
  }

  return fieldValue.length > 0;
}

function isValidRequiredNumericField( fieldReference ) {
  var field = $( fieldReference );
  var fieldValue = $.trim( field.val() );

  var isInvalid = !$.isNumeric( fieldValue ) || ( $.isNumeric( fieldValue ) && fieldValue <= 0 );
  if ( isInvalid ) {
    field.closest( ".control-group" ).addClass( "error" );
    field.parent().find( "span.help-inline" ).html( "Enter a number greater than zero" );
  } else {
    field.closest( ".control-group" ).removeClass( "error" );
    field.parent().find( "span.help-inline" ).html( "" );
  }

  return !isInvalid;
}

function getCategories() {
  return [ {
    "$id": "1",
    "CategoryID": 1,
    "Description": "Transitions",
    "Subcategories": [ {
      "$id": "2",
      "SubcategoryID": 1,
      "Description": "Arrival routine"
    },
    {
      "$id": "3",
      "SubcategoryID": 2,
      "Description": "Transition to next component"
    },
    {
      "$id": "4",
      "SubcategoryID": 3,
      "Description": "Dismissal routine"
    },
    {
      "$id": "5",
      "SubcategoryID": 4,
      "Description": "Unplanned interruption"
    }
    ]
  },
  {
    "$id": "6",
    "CategoryID": 2,
    "Description": "Teacher-Led Time",
    "Subcategories": [ {
      "$id": "7",
      "SubcategoryID": 5,
      "Description": "Welcome / lesson launch"
    },
    {
      "$id": "8",
      "SubcategoryID": 6,
      "Description": "Teacher-directed instruction"
    },
    {
      "$id": "9",
      "SubcategoryID": 7,
      "Description": "Whole-class discussion / activity"
    }
    ]
  },
  {
    "$id": "10",
    "CategoryID": 3,
    "Description": "Student Work Time",
    "Subcategories": [ {
      "$id": "11",
      "SubcategoryID": 8,
      "Description": "Small group discussion /activity"
    },
    {
      "$id": "12",
      "SubcategoryID": 9,
      "Description": "Independent practice / activity"
    },
    {
      "$id": "13",
      "SubcategoryID": 10,
      "Description": "Combined practices"
    }
    ]
  },
  {
    "$id": "14",
    "CategoryID": 4,
    "Description": "Assessment of Student Learning",
    "Subcategories": [ {
      "$id": "15",
      "SubcategoryID": 11,
      "Description": "Oral assessment of student learning"
    },
    {
      "$id": "16",
      "SubcategoryID": 12,
      "Description": "Written assessment of student learning"
    }
    ]
  }
  ];
}

function startActivity() {
  return $.ajax( {
    url: "api/SubcategoryItem/",
    type: "POST",
    contentType: "application/json;charset=utf-8"
  } );
}

function startNewActivity() {

  // disable the enter activity button first
  disableEnterActivity();

  // @FIXME
  /*
  $.ajax( {
    url: "api/SubmissionItem/",
    type: "POST",
    contentType: "application/json;charset=utf-8",
    datatype: "json",
    data: JSON.stringify( {
      SubmissionID: currentSubmissionVm.SubmissionID()
    } ),
    success: function() {

      enableEnterActivity();
    }
  } );
  */
  enableEnterActivity();

}

function disableEnterActivity() {
  $( "#enterActivity" ).addClass( "disabled" ).attr( "disabled", "disabled" );
}

function enableEnterActivity() {
  $( "#enterActivity" ).removeClass( "disabled" ).removeAttr( "disabled" );
}

function isPastActivitySubmissionThreshold() {
  var currentInterval = ( new Date().getTime() - currentActivityStartTime ) / 1000;
  return currentInterval >= ACTIVITYSUBMISSIONTHRESHOLD;
}

function showDateLocal( dateString ) {
  var date = new Date( dateString );
  return date.toString( "MMMM d, yyyy" ) + " at " + date.toString( "h:mm tt" );
}

function getSubmission( submissionID ) {
  return ( JSON.parse( localStorage.getItem( "Session" ) ) || "{}" )[ submissionID ] || {};
}

function getSubmissionItems( submissionID ) {
  return ( JSON.parse( localStorage.getItem( "Session" ) ) || "{}" )[ submissionID ]?.SubmissionItems || [];
}

function loadSubmission( submissionID ) {
  $.when( getSubmission( submissionID ), getSubmissionItems( submissionID ) )
    .then( ( s, si ) => {
      ko.mapping.fromJSON( s, {}, currentSubmissionVm );
      currentActivityEditVM.items( [] );
      currentActivityEditVM.items(
        ko.utils.arrayMap( si, item => {
          console.log( item.StartTime );
          return new activityItemEdit(
            s.SubmissionID,
            si.indexOf( item ),
            currentActivityEditVM.categoryList[ item.CategoryID - 1 ],
            _.find( currentActivityEditVM.categoryList[ item.CategoryID - 1 ].Subcategories,
              sc => { return sc.SubcategoryID == item.SubcategoryID; } ),
            item.Description,
            moment( item.StartTime ).format( "h:mm:ss A" ),
            moment( item.EndTime ).format( "h:mm:ss A" ),
            item.Duration.toHHMMSS(),
            currentActivityEditVM.categoryList
          );
        } ) );
      // Set newly gened textareas
      var $targetfields = $(
        "#observationEditForm textarea[data-maxsize]"
      ); // get INPUTs and TEXTAREAs on page with "data-maxsize" attr defined
      setformfieldsize( $targetfields );

      $( "#landing" ).fadeOut( FADEINTERVAL, () => {
        $( "#observationEditForm" ).fadeIn( FADEINTERVAL );
      } );
    } );
  ko.mapping.fromJSON( JSON.parse( localStorage.getItem( "Session" ) )[ submissionID ] /* ?.SubmissionItems */, {}, currentSubmissionVm );
}