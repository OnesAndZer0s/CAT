/* eslint-disable no-use-before-define */
/* eslint "jsdoc/require-jsdoc": "off" */

/*
@TODO - add a back/prev button
@TODO - actually format and print a document
*/
import $ from "jquery";
import ko from "knockout";
import "knockout-mapping";
import moment from "moment";
import Highcharts from "highcharts";
import _ from "underscore";

import { toHHMMSS } from "./util.js";
import { ActivityManager, ActivityTimer, Category, ActivityEditVM, ActivityMonitor, ActivityItemEdit } from "./activity.js";
import { CATEGORIES } from "./consts.js";
var pages,
    currentPageIndex,

    FIRSTPAGEINDEX = 0,
    LASTPAGEINDEX,
    FADEINTERVAL = 350,

    // Minimum allowable time for submission of new activity
    // @FIXME 5
    ACTIVITYSUBMISSIONTHRESHOLD = 0;

// @FIXME
// window.onbeforeunload = function() {
//   return "You are about to exit the Classroom Time Analysis Tool.";
// };

$( document ).ready( () => {
  ActivityManager.currentActivityTimer = new ActivityTimer();


  // bind categories
  ActivityManager.currentCategory = new Category( CATEGORIES );
  ko.applyBindings( ActivityManager.currentCategory, $( "#observationEntryForm" )[ 0 ] );
  ActivityManager.baseCategory = ActivityManager.currentCategory.category();

  ActivityManager.currentActivityEditVM = new ActivityEditVM();
  ko.applyBindings( ActivityManager.currentActivityEditVM, $( "#observationEditForm" )[ 0 ] );
  ActivityManager.currentActivityEditVM.categoryList = CATEGORIES;

  ActivityManager.currentActivityMonitor = new ActivityMonitor();
  ko.applyBindings( ActivityManager.currentActivityMonitor, $( "#activitySidebar" )[ 0 ] );
  $( "input" ).keypress( evt => {
    // Deterime where our character code is coming from within the event
    var charCode = evt.charCode || evt.keyCode;

    if( charCode == 13 ) // Enter key's keycode
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
    $( this ).popover( { placement: "bottom" } );
  } );

  $( "#poptimetracker" ).each( function() {
    $( this ).popover( { placement: "left" } );
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
      if( Object.keys( JSON.parse( localStorage.getItem( "Session" ) || "{}" ) ).length )
        $( "#landingMain" ).fadeIn( FADEINTERVAL );
      else {
        showWizard();

        $( "#observationEntryAlert, #observationEntryAlert2" ).hide();

        ActivityManager.currentSubmissionVm.clearValues();
        ActivityManager.currentActivityMonitor.clearActivities();
        ActivityManager.currentActivityEditVM.items( [] );
        $( "#startObservationReady" ).fadeIn( FADEINTERVAL, () => {
          $( "#infoClass" ).focus();
        } );
      }
    } );

  } );

  $( "#createNewSubmission" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();

    showWizard();

    $( "#observationEntryAlert, #observationEntryAlert2" ).hide();

    ActivityManager.currentSubmissionVm.clearValues();
    ActivityManager.currentActivityMonitor.clearActivities();
    ActivityManager.currentActivityEditVM.items( [] );

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
      ActivityManager.currentActivityStartTime = new Date().getTime();
      ActivityManager.currentActivityTimer.start();
    } );
  } );

  $( "#startObservationReady" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();

    var validClass = isValidRequiredField( "#infoClass" ),
        validTeacher = isValidRequiredField( "#infoTeacher" ),
        validTotalTime = isValidRequiredNumericField( "#infoTotalTime" ),
        validObserver = isValidRequiredField( "#infoObserver" ),
        validClassSize = isValidRequiredNumericField( "#infoClassSize" ),

        validPage = validClass && validTeacher && validTotalTime && validObserver &&
            validClassSize;

    if( validPage ) {
      $( "#observationDetailsAlert" ).fadeOut( FADEINTERVAL );
      $( "#observationDetails" ).fadeOut( FADEINTERVAL );
      var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );

      temp[ ActivityManager.currentSubmissionVm.SubmissionID() ] = JSON.parse( ko.mapping.toJSON( ActivityManager.currentSubmissionVm ) );
      localStorage.setItem( "Session", JSON.stringify( temp ) );
      ko.mapping.fromJS( temp[ ActivityManager.currentSubmissionVm.SubmissionID() ], {}, ActivityManager.currentSubmissionVm );

      $( "#observationDetails" ).fadeOut( FADEINTERVAL, () => {
        ActivityManager.currentActivityMonitor.className( ActivityManager.currentSubmissionVm.Class() );
        ActivityManager.currentActivityMonitor.teacherName( ActivityManager.currentSubmissionVm.Teacher() );

        $( "#preObservationEntry" ).fadeIn( FADEINTERVAL );

        startNewActivity();
      } );

    } else

      $( "#observationDetailsAlert" ).fadeIn( FADEINTERVAL );

  } );

  $( "#enterActivity" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();

    if( isPastActivitySubmissionThreshold() ) {
      // @FIXME
      var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" ),
          x = temp[ ActivityManager.currentSubmissionVm.SubmissionID() ].SubmissionItems || [];

      x.push( {
        CategoryID: ActivityManager.currentCategory.category().CategoryID,
        SubcategoryID: ActivityManager.currentCategory.subcategory().SubcategoryID,
        Description: ActivityManager.currentCategory.notes(),
        Duration: Math.round( ( new Date().getTime() - ActivityManager.currentActivityStartTime ) / 1000 ) * 1000,
        StartTime: ActivityManager.currentActivityStartTime,
        EndTime: new Date().getTime()
      } );
      temp[ ActivityManager.currentSubmissionVm.SubmissionID() ].SubmissionItems = x;
      localStorage.setItem( "Session", JSON.stringify( temp ) );

      ActivityManager.currentActivityMonitor.addActivity( ActivityManager.currentCategory
        .category(), ActivityManager.currentCategory.subcategory(), moment( ActivityManager.currentActivityTimer.milliseconds ).subtract( "minutes", new Date().getTimezoneOffset() ).format( "h:mm:ss" ) /* this is time passed */ );

      // startNewActivity();

      // reset - note time to the millisecond
      ActivityManager.currentActivityStartTime = new Date().getTime();

      ActivityManager.currentCategory.category( ActivityManager.baseCategory );
      // $('#entryCategory')[0].selectedIndex = 0;
      ActivityManager.currentCategory.notes( "" );
      $( "#entryNotesStatus" ).html( "0" ).css( "color", "black" );

      // scroll to top
      $( "html, body" ).animate( { scrollTop: 0 }, "fast" );
    }
  } );

  $( "#endObservation, #endObservation2" ).on( "click", e => {

    e.preventDefault();
    e.stopPropagation();
    var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" ),
        x = temp[ ActivityManager.currentSubmissionVm.SubmissionID() ].SubmissionItems || [];

    x.push( {
      CategoryID: ActivityManager.currentCategory.category().CategoryID,
      SubcategoryID: ActivityManager.currentCategory.subcategory().SubcategoryID,
      Description: ActivityManager.currentCategory.notes(),
      Duration: Math.round( ( new Date().getTime() - ActivityManager.currentActivityStartTime ) / 1000 ) * 1000,
      StartTime: ActivityManager.currentActivityStartTime,
      EndTime: new Date().getTime()
    } );
    temp[ ActivityManager.currentSubmissionVm.SubmissionID() ].SubmissionItems = x;
    localStorage.setItem( "Session", JSON.stringify( temp ) );
    // Reset form
    ActivityManager.currentCategory.category( ActivityManager.baseCategory );
    ActivityManager.currentCategory.notes( "" );
    $( "#entryNotesStatus" ).html( "0" ).css( "color", "black" );

    ActivityManager.currentActivityEditVM.items( ko.utils.arrayMap( temp[ ActivityManager.currentSubmissionVm.SubmissionID() ].SubmissionItems, item => {
      return new ActivityItemEdit( ActivityManager.currentSubmissionVm.SubmissionID,
        item.SubmissionItemID,
        ActivityManager.currentActivityEditVM.categoryList[ item.CategoryID - 1 ],
        _.find( ActivityManager.currentActivityEditVM.categoryList[ item.CategoryID - 1 ].Subcategories,
          sc => { return sc.SubcategoryID == item.SubcategoryID; } ),
        item.Description,
        moment( item.StartTime ).format( "h:mm:ss A" ), // whatever this is.
        moment( item.EndTime ).format( "h:mm:ss A" ),
        toHHMMSS( item.Duration ),
        ActivityManager.currentActivityEditVM.categoryList );
    } ) );

    // Set newly gened textareas
    var $targetfields = $( "#observationEditForm textarea[data-maxsize]" ); // get INPUTs and TEXTAREAs on page with "data-maxsize" attr defined

    $( "#observationEntry" ).fadeOut( FADEINTERVAL,
      () => {
        $( "#submissionPages" ).hide();
        $( "#observationEditForm" ).fadeIn( FADEINTERVAL );
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
  } );

  $( "#editProfile, #editProfileMenu" ).on( "click", e => {

    // But allow propogation to let menu close
    e.preventDefault();


    // Means that the user is currently editing a scenario
    if( $( "#landing" ).is( ":hidden" ) && $( "#userInformation" ).is( ":hidden" ) )
      saveVM();


    showUserInformation();
  } );

  $( "#submitScenario" ).on( "click", e => {
    e.preventDefault();
    e.stopPropagation();
    ActivityManager.currentVM.IsSubmitted = true;
    saveVM();
    showLanding();
  } );

  // $( "#standardStartTime, #standardEndTime" )
  //   .timeEntry( {
  //     ampmPrefix: " ",
  //     beforeShow: timeRangeStandard
  //   } );

  // $( "#erStartTime, #erEndTime" )
  //   .timeEntry( {
  //     ampmPrefix: " ",
  //     beforeShow: timeRangeER
  //   } );

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
    var _actual = ko.observable( initialValue ),

        result = ko.dependentObservable( {
          read: function() {
            return _actual();
          },
          write: function( newValue ) {
            // Do not allow negative numbers
            if( !isNaN( newValue ) )
              newValue = Math.abs( newValue );
            var parsedValue = parseFloat( newValue );

            _actual( isNaN( parsedValue ) ? 0 : Math.abs( parsedValue ) );
          }
        } );

    return result;
  };

  ActivityManager.currentSubmissionVm = new submissionViewModel();
  ko.applyBindings( ActivityManager.currentSubmissionVm, $( "#observationDetails" )[ 0 ] );
} );



function showWizard() {

  $( "#userInformation" ).fadeOut( FADEINTERVAL );
  $( "#landing" ).fadeOut( FADEINTERVAL, () => {
    // Show the first page
    $( pages[ FIRSTPAGEINDEX ] ).fadeIn( FADEINTERVAL );

    var fadeInCount = 0;

    $( "#infoSidebar, #submissionPages, #sectionsContainer" ).fadeIn( FADEINTERVAL, () => {
      if( ++fadeInCount == 3 ) {
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

  $( pages[ currentPageIndex ] ).fadeOut( FADEINTERVAL );

  var fadeOutCount = 0;

  $( "#submissionPages, #sectionsContainer, #landing" ).fadeOut( FADEINTERVAL, () => {
    if( ++fadeOutCount == 3 ) {
      loadSubmissionsList();
      $( "#landing" ).fadeIn( FADEINTERVAL, () => {
        $( "#goBackMenu, #goNextMenu, #saveMenu" ).addClass( "disabled" );
        $( "#home" ).removeClass( "disabled" );
      } );
    }

  } );
}

function showUserInformation() {

  // Fade out current page
  $( pages[ currentPageIndex ] ).fadeOut( FADEINTERVAL );

  var fadeOutCount = 0;

  $( "#submissionPages, #sectionsContainer, #landing, #needProfile" ).fadeOut( FADEINTERVAL, () => {

    if( ++fadeOutCount == 4 )
      $( "#userInformation" ).fadeIn( FADEINTERVAL, () => {
        $( "#goBackMenu, #goNextMenu, #saveMenu, #home" ).addClass( "disabled" );
        $( "#infoName" ).select();
      } );

  } );
}

function initLanding() {
  $( "#goBackMenu, #goNextMenu, #saveMenu" ).addClass( "disabled" );
  $( pages[ currentPageIndex ] ).hide();
  ActivityManager.currentSubmissionsList = new submissionsModel();
  loadSubmissionsList();
  ko.applyBindings( ActivityManager.currentSubmissionsList, document.getElementById( "landing" ) );
  setTimeout( () => {
    $( "#landingTable" ).fadeIn( FADEINTERVAL );
  }, FADEINTERVAL );
}

function loadSubmissionsList() {
  var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );

  ActivityManager.currentSubmissionsList.submissions( ko.utils.arrayMap( Object.keys( temp ), submission => {
    return {
      submissionID: temp[ submission ].SubmissionID,
      name: `${ temp[ submission ].Teacher } - ${ temp[ submission ].Class }`,
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
        ActivityManager.currentVM.SubmissionID( data.SubmissionID );
        ActivityManager.currentVM.Name( data.Name );
        ActivityManager.currentVM.IsSubmitted( data.IsSubmitted );
        ActivityManager.currentVM.LastUpdated( Date.parse( data.LastUpdated ) );

        ActivityManager.currentVM.Phone( data.Phone );
        ActivityManager.currentVM.SchoolName( data.SchoolName );
        ActivityManager.currentVM.StreetAddress( data.StreetAddress );
        ActivityManager.currentVM.City( data.City );
        ActivityManager.currentVM.State( data.State );
        ActivityManager.currentVM.Zip( data.Zip );

        ActivityManager.currentVM.GradeECE( data.GradeECE );
        ActivityManager.currentVM.GradeK( data.GradeK );
        ActivityManager.currentVM.Grade1( data.Grade1 );
        ActivityManager.currentVM.Grade2( data.Grade2 );
        ActivityManager.currentVM.Grade3( data.Grade3 );
        ActivityManager.currentVM.Grade4( data.Grade4 );
        ActivityManager.currentVM.Grade5( data.Grade5 );
        ActivityManager.currentVM.Grade6( data.Grade6 );
        ActivityManager.currentVM.Grade7( data.Grade7 );
        ActivityManager.currentVM.Grade8( data.Grade8 );
        ActivityManager.currentVM.Grade9( data.Grade9 );
        ActivityManager.currentVM.Grade10( data.Grade10 );
        ActivityManager.currentVM.Grade11( data.Grade11 );
        ActivityManager.currentVM.Grade12( data.Grade12 );

        ActivityManager.currentVM.D5( Date.parse( data.D5 ) );
        ActivityManager.currentVM.D6( Date.parse( data.D6 ) );
        ActivityManager.currentVM.D10( Date.parse( data.D10 ) );
        ActivityManager.currentVM.D11( Date.parse( data.D11 ) );

        ActivityManager.currentVM.PeriodsPerDayStd( data.PeriodsPerDayStd );
        ActivityManager.currentVM.MinutesPerPeriodStd( data.MinutesPerPeriodStd );
        ActivityManager.currentVM.PeriodsPerDayEr( data.PeriodsPerDayEr );
        ActivityManager.currentVM.MinutesPerPeriodEr( data.MinutesPerPeriodEr );


        ActivityManager.currentVM.D8( data.D8 );
        ActivityManager.currentVM.D13( data.D13 );
        ActivityManager.currentVM.D16( data.D16 );
        ActivityManager.currentVM.D17( data.D17 );

        ActivityManager.currentVM.C23( data.C23 );
        ActivityManager.currentVM.C24( data.C24 );
        ActivityManager.currentVM.C25( data.C25 );
        ActivityManager.currentVM.C26( data.C26 );
        ActivityManager.currentVM.C27( data.C27 );
        ActivityManager.currentVM.C28( data.C28 );
        ActivityManager.currentVM.C28text( data.C28text );
        ActivityManager.currentVM.C30( data.C30 );
        ActivityManager.currentVM.C31( data.C31 );
        ActivityManager.currentVM.C32( data.C32 );
        ActivityManager.currentVM.C33( data.C33 );
        ActivityManager.currentVM.C33text( data.C33text );

        ActivityManager.currentVM.G23( data.G23 );
        ActivityManager.currentVM.G24( data.G24 );
        ActivityManager.currentVM.G25( data.G25 );
        ActivityManager.currentVM.G26( data.G26 );
        ActivityManager.currentVM.G27( data.G27 );
        ActivityManager.currentVM.G27text( data.G27text );
        ActivityManager.currentVM.G28( data.G28 );
        ActivityManager.currentVM.G28text( data.G28text );
        ActivityManager.currentVM.G30( data.G30 );
        ActivityManager.currentVM.G31( data.G31 );
        ActivityManager.currentVM.G32( data.G32 );
        ActivityManager.currentVM.G32text( data.G32text );

        ActivityManager.currentVM.K22( data.K22 );
        ActivityManager.currentVM.K23( data.K23 );
        ActivityManager.currentVM.K24( data.K24 );
        ActivityManager.currentVM.K25( data.K25 );
        ActivityManager.currentVM.K26( data.K26 );
        ActivityManager.currentVM.K26text( data.K26text );
        ActivityManager.currentVM.K27( data.K27 );
        ActivityManager.currentVM.K27text( data.K27text );

        ActivityManager.currentVM.C42( data.C42 );
        ActivityManager.currentVM.C43( data.C43 );
        ActivityManager.currentVM.C44( data.C44 );

        ActivityManager.currentVM.G42( data.G42 );
        ActivityManager.currentVM.G43( data.G43 );
        ActivityManager.currentVM.G44( data.G44 );

        ActivityManager.currentVM.G51( data.G51 );
        ActivityManager.currentVM.G52( data.G52 );
        ActivityManager.currentVM.G53( data.G53 );

        ActivityManager.currentVM.K51( data.K51 );
        ActivityManager.currentVM.K52( data.K52 );
        ActivityManager.currentVM.K53( data.K53 );
        ActivityManager.currentVM.K54( data.K54 );
        ActivityManager.currentVM.K55( data.K55 );

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

  temp[ ActivityManager.currentVM.SubmissionID() ] = JSON.parse( ko.toJSON( ActivityManager.currentVm ) );
  localStorage.setItem( "Session", JSON.stringify( temp ) );
}

function timeRangeStandard( input ) {
  return {
    minTime: input.id == "standardEndTime" ? $( "#standardStartTime" ).timeEntry( "getTime" ) : null,
    maxTime: input.id == "standardStartTime" ? $( "#standardEndTime" ).timeEntry( "getTime" ) : null
  };
}

function timeRangeER( input ) {
  return {
    minTime: input.id == "erEndTime" ? $( "#erStartTime" ).timeEntry( "getTime" ) : null,
    maxTime: input.id == "erStartTime" ? $( "#erEndTime" ).timeEntry( "getTime" ) : null
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
    title: { text: "Weekly Minutes" },
    tooltip: { percentageDecimals: 1 },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: { enabled: false },
        showInLegend: true
      }
    },
    series: [ {
      type: "pie",
      name: "Time spent",
      data: [ {
        name: "Academics / Academic Support",
        y: Math.round( ActivityManager.currentVM.D64() * 10 ) / 10,
        sliced: true,
        selected: true,
        color: "#660066"
      },
      {
        name: "Specials / Electives",
        y: Math.round( ActivityManager.currentVM.H64() * 10 ) / 10,
        color: "#6E8890"
      },
      {
        name: "Other",
        y: Math.round( ActivityManager.currentVM.L64() * 10 ) / 10,
        color: "#7F866C"
      } ]
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
    title: { text: "Annual Hours" },
    tooltip: { percentageDecimals: 1 },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: { enabled: false },
        showInLegend: true
      }
    },
    series: [ {
      type: "pie",
      name: "Time spent",
      data: [ {
        name: "Academics / Academic Support",
        y: Math.round( ActivityManager.currentVM.D68() * 10 ) / 10,
        sliced: true,
        selected: true,
        color: "#660066"
      },
      {
        name: "Specials / Electives",
        y: Math.round( ActivityManager.currentVM.H68() * 10 ) / 10,
        color: "#6E8890"
      },
      {
        name: "Other",
        y: Math.round( ActivityManager.currentVM.L68() * 10 ) / 10,
        color: "#7F866C"
      } ]
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
    $.trim( ActivityManager.currentVM.Phone() ).length == 0 ||
        $.trim( ActivityManager.currentVM.SchoolName() ).length == 0 ||
        $.trim( ActivityManager.currentVM.StreetAddress() ).length == 0 ||
        $.trim( ActivityManager.currentVM.City() ).length == 0 ||
        $.trim( ActivityManager.currentVM.State() ).length == 0 ||
        $.trim( ActivityManager.currentVM.Zip() ).length == 0 ||

        !ActivityManager.currentVM.GradeECE() &&
        !ActivityManager.currentVM.GradeK() &&
        !ActivityManager.currentVM.Grade1() &&
        !ActivityManager.currentVM.Grade2() &&
        !ActivityManager.currentVM.Grade3() &&
        !ActivityManager.currentVM.Grade4() &&
        !ActivityManager.currentVM.Grade5() &&
        !ActivityManager.currentVM.Grade6() &&
        !ActivityManager.currentVM.Grade7() &&
        !ActivityManager.currentVM.Grade8() &&
        !ActivityManager.currentVM.Grade9() &&
        !ActivityManager.currentVM.Grade10() &&
        !ActivityManager.currentVM.Grade11() &&
        !ActivityManager.currentVM.Grade12()

  );
  return isValid;
}

function navigate( newPageIndex ) {
  saveVM();

  // Don't navigate from page 1 unless valid...unless going back to first page
  if( currentPageIndex == 0 )
    if( !isPageOneValid() ) {
      $( "#schoolReportDetails div.alert" ).fadeIn( FADEINTERVAL );
      return false;
    } else
      $( "#schoolReportDetails div.alert" ).fadeOut( FADEINTERVAL );
  // Fade out both buttons with page
  $( "#goBack, #goNext, #goSave" ).fadeOut( FADEINTERVAL );

  // If designated sidebar is going to change, fade out
  if(
    $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel1" && $( pages[ currentPageIndex ] ).data( "sidebar" ) == "panel2" ||
        $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel2" && $( pages[ currentPageIndex ] ).data( "sidebar" ) == "panel1"
  ) $( ".panel" ).fadeOut( FADEINTERVAL );

  // Fade out current page
  $( pages[ currentPageIndex ] ).fadeOut( FADEINTERVAL, () => {

    // Change nav options for Back based on availability
    if( newPageIndex != FIRSTPAGEINDEX ) {
      $( "#goBack" ).fadeIn( FADEINTERVAL );
      $( "#goBackMenu" ).removeClass( "disabled" );
    } else
      $( "#goBackMenu" ).addClass( "disabled" );


    // Change nave options for Next based on availability
    if( newPageIndex != LASTPAGEINDEX ) {
      $( "#goNext" ).fadeIn( FADEINTERVAL );
      $( "#goNextMenu" ).removeClass( "disabled" );
    } else
      $( "#goNextMenu" ).addClass( "disabled" );


    $( "#goSave" ).fadeIn( FADEINTERVAL );

    // Fade in panels
    if( $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel1" && !$( "#panel1" ).is( ":visible" ) ) $( "#panel1" ).fadeIn( FADEINTERVAL );
    if( $( pages[ newPageIndex ] ).data( "sidebar" ) == "panel2" && !$( "#panel2" ).is( ":visible" ) ) $( "#panel2" ).fadeIn( FADEINTERVAL );

    // Fade in new page
    // Create/update charts when new page is analysis - after page show
    if( newPageIndex == 0 ) // ANALYSISPAGEINDEX
      $( pages[ newPageIndex ] ).fadeIn( FADEINTERVAL, createChart );
    else
      $( pages[ newPageIndex ] ).fadeIn( FADEINTERVAL );




    // Set page to top of scroll
    window.scrollTo( 0, 0 );

    // Highlight proper transfer section
    setSection( $( pages[ newPageIndex ] ).attr( "data-section" ) );


    $( pages[ newPageIndex ] ).find( "input.defaultfocus" ).focus().select();
  } );

  // Set current page to be the new page
  currentPageIndex = newPageIndex;

}

function setSection( sectionID ) {
  $( "#sections li" ).removeClass( "active" );
  $( "#sections li[data-section=\"" + sectionID + "\"]" ).addClass( "active" );
}

function displayTime( date ) {
  var hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours(),
      minutes = date.getMinutes() > 9 ? date.getMinutes().toString() : "0" + date.getMinutes().toString(),
      period = date.getHours() > 12 ? "PM" : "AM";

  return hours + ":" + minutes + "\xA0" + period;
}

function displayNumberPct( number ) {
  return displayNumber( number, 1, "% allocated time" );
}

function displayNumber( number, decimalPlaces, suffix ) {
  if( decimalPlaces == undefined ) decimalPlaces = 0;
  var value = parseFloat( number );

  if( isNaN( value ) ) value = 0;
  return suffix == undefined ? value.toFixed( decimalPlaces ) : value.toFixed( decimalPlaces ) + suffix;
}

function parseNvPairString( qs ) {
  var nvpair = {},
      pairs = qs.split( "&" );

  $.each( pairs, ( i, v ) => {
    var pair = v.split( "=" );

    nvpair[ pair[ 0 ] ] = pair[ 1 ];
  } );
  return nvpair;
}

function getTimeStamp() {
  var currentDate = new Date(),
      currentTime = currentDate.getTime(),
      localOffset = -1 * currentDate.getTimezoneOffset() * 60000,
      stamp = Math.round( new Date( currentTime + localOffset ).getTime() / 1000 );

  return stamp;
}

// function nctlUserViewModel() {
//    ;

//    this.EmailAddress = ko.observable();
//    this.Name = ko.observable();
//    this.Phone = ko.observable();
//    this.SchoolName = ko.observable();
//    this.StreetAddress = ko.observable();
//    this.City = ko.observable();
//    this.State = ko.observable();
//    this.Zip = ko.observable();
//    this.LastLogin = ko.observable();
// }

function appViewModel() {

  

  this.SubmissionID = ko.observable();
  this.Name = ko.observable();
  this.IsSubmitted = ko.observable();
  this.LastUpdated = ko.observable();

  this.Phone = ko.observable();
  this.SchoolName = ko.observable();
  this.StreetAddress = ko.observable();
  this.City = ko.observable();
  this.State = ko.observable();
  this.Zip = ko.observable();

  this.GradeECE = ko.observable();
  this.GradeK = ko.observable();
  this.Grade1 = ko.observable();
  this.Grade2 = ko.observable();
  this.Grade3 = ko.observable();
  this.Grade4 = ko.observable();
  this.Grade5 = ko.observable();
  this.Grade6 = ko.observable();
  this.Grade7 = ko.observable();
  this.Grade8 = ko.observable();
  this.Grade9 = ko.observable();
  this.Grade10 = ko.observable();
  this.Grade11 = ko.observable();
  this.Grade12 = ko.observable();


  // SECTION 1
  this.D5 = ko.observable( new Date( 1, 1, 1, 8, 0, 0, 0 ) );
  this.D6 = ko.observable( new Date( 1, 1, 1, 15, 0, 0, 0 ) );
  this.D8 = ko.numericObservable( 0 );

  this.D10 = ko.observable( new Date( 1, 1, 1, 8, 0, 0, 0 ) );
  this.D11 = ko.observable( new Date( 1, 1, 1, 15, 0, 0, 0 ) );
  this.D13 = ko.numericObservable( 0 );
  this.D16 = ko.numericObservable( 0 );
  this.D17 = ko.numericObservable( 0 );

  this.PeriodsPerDayStd = ko.numericObservable( 0 );
  this.MinutesPerPeriodStd = ko.numericObservable( 0 );
  this.PeriodsPerDayEr = ko.numericObservable( 0 );
  this.MinutesPerPeriodEr = ko.numericObservable( 0 );

  this.G8 = ko.computed( () => {
    return ( this.D6().getHours() - this.D5().getHours() ) * 60 + ( this.D6().getMinutes() -
            this.D5().getMinutes() );
  } );

  this.G13 = ko.computed( () => {
    return ( this.D11().getHours() - this.D10().getHours() ) * 60 + ( this.D11().getMinutes() -
            this.D10().getMinutes() );
  } );

  this.G15 = ko.computed( () => {
    return this.G8() * this.D8() + this.G13() * this.D13();
  } );

  this.G17 = ko.computed( () => {
    return ( this.D16() * this.G8() + this.D17() * this.G13() ) / 60;
  } );


  // SECTION 2 - Academics / Academic Support
  this.C23 = ko.numericObservable( 0 );
  this.C24 = ko.numericObservable( 0 );
  this.C25 = ko.numericObservable( 0 );
  this.C26 = ko.numericObservable( 0 );
  this.C27 = ko.numericObservable( 0 );
  this.C28 = ko.numericObservable( 0 );
  this.C28text = ko.observable( "Other" );

  this.C30 = ko.numericObservable( 0 );
  this.C31 = ko.numericObservable( 0 );
  this.C32 = ko.numericObservable( 0 );
  this.C33 = ko.numericObservable( 0 );
  this.C33text = ko.observable( "Other" );

  this.D23 = ko.computed( () => {
    return this.C23() / this.G15() * 100;
  } );

  this.D24 = ko.computed( () => {
    return this.C24() / this.G15() * 100;
  } );

  this.D25 = ko.computed( () => {
    return this.C25() / this.G15() * 100;
  } );

  this.D26 = ko.computed( () => {
    return this.C26() / this.G15() * 100;
  } );

  this.D27 = ko.computed( () => {
    return this.C27() / this.G15() * 100;
  } );

  this.D28 = ko.computed( () => {
    return this.C28() / this.G15() * 100;
  } );


  this.D30 = ko.computed( () => {
    return this.C30() / this.G15() * 100;
  } );

  this.D31 = ko.computed( () => {
    return this.C31() / this.G15() * 100;
  } );

  this.D32 = ko.computed( () => {
    return this.C32() / this.G15() * 100;
  } );

  this.D33 = ko.computed( () => {
    return this.C33() / this.G15() * 100;
  } );

  // SECTION 2 - Academics / Academic Support - Rollups
  this.C22 = ko.computed( () => {
    return this.C23() + this.C24() + this.C25() + this.C26() + this.C27() + this.C28();
  } );

  this.D22 = ko.computed( () => {
    return this.C22() / this.G15() * 100;
  } );

  this.C29 = ko.computed( () => {
    return this.C30() + this.C31() + this.C32() + this.C33();
  } );

  this.D29 = ko.computed( () => {
    return this.C29() / this.G15() * 100;
  } );

  this.C35 = ko.computed( () => {
    return this.C29() + this.C22();
  } );

  this.C36 = ko.computed( () => {
    return this.C35() / 60;
  } );

  this.D35 = ko.computed( () => {
    return this.C35() / this.G15() * 100;
  } );

  this.C37 = ko.computed( () => {
    return this.D35() * this.G17() / this.D16() / 100;
  } );

  // SECTION 2 - Non-Core Academic
  this.G23 = ko.numericObservable( 0 );
  this.G24 = ko.numericObservable( 0 );
  this.G25 = ko.numericObservable( 0 );
  this.G26 = ko.numericObservable( 0 );
  this.G27 = ko.numericObservable( 0 );
  this.G27text = ko.observable( "Other" );
  this.G28 = ko.numericObservable( 0 );
  this.G28text = ko.observable( "Other" );

  this.G30 = ko.numericObservable( 0 );
  this.G31 = ko.numericObservable( 0 );
  this.G32 = ko.numericObservable( 0 );
  this.G32text = ko.observable( "Other" );

  this.H23 = ko.computed( () => {
    return this.G23() / this.G15() * 100;
  } );

  this.H24 = ko.computed( () => {
    return this.G24() / this.G15() * 100;
  } );

  this.H25 = ko.computed( () => {
    return this.G25() / this.G15() * 100;
  } );

  this.H26 = ko.computed( () => {
    return this.G26() / this.G15() * 100;
  } );

  this.H27 = ko.computed( () => {
    return this.G27() / this.G15() * 100;
  } );

  this.H28 = ko.computed( () => {
    return this.G28() / this.G15() * 100;
  } );


  this.H30 = ko.computed( () => {
    return this.G30() / this.G15() * 100;
  } );

  this.H31 = ko.computed( () => {
    return this.G31() / this.G15() * 100;
  } );

  this.H32 = ko.computed( () => {
    return this.G32() / this.G15() * 100;
  } );

  // SECTION 2 - Non-Core Academic - Rollups
  this.G22 = ko.computed( () => {
    return this.G23() + this.G24() + this.G25() + this.G26() + this.G27() + this.G28();
  } );

  this.H22 = ko.computed( () => {
    return this.G22() / this.G15() * 100;
  } );

  this.G29 = ko.computed( () => {
    return this.G30() + this.G31() + this.G32();
  } );

  this.H29 = ko.computed( () => {
    return this.G29() / this.G15() * 100;
  } );

  this.G35 = ko.computed( () => {
    return this.G29() + this.G22();
  } );

  this.G36 = ko.computed( () => {
    return this.G35() / 60;
  } );

  this.H35 = ko.computed( () => {
    return this.G35() / this.G15() * 100;
  } );

  this.G37 = ko.computed( () => {
    return this.H35() * this.G17() / this.D16() / 100;
  } );

  // SECTION 2 - Other
  this.K22 = ko.numericObservable( 0 );
  this.K23 = ko.numericObservable( 0 );
  this.K24 = ko.numericObservable( 0 );
  this.K25 = ko.numericObservable( 0 );
  this.K26 = ko.numericObservable( 0 );
  this.K26text = ko.observable( "Other" );
  this.K27 = ko.numericObservable( 0 );
  this.K27text = ko.observable( "Other" );

  this.L22 = ko.computed( () => {
    return this.K22() / this.G15() * 100;
  } );

  this.L23 = ko.computed( () => {
    return this.K23() / this.G15() * 100;
  } );

  this.L24 = ko.computed( () => {
    return this.K24() / this.G15() * 100;
  } );

  this.L25 = ko.computed( () => {
    return this.K25() / this.G15() * 100;
  } );

  this.L26 = ko.computed( () => {
    return this.K26() / this.G15() * 100;
  } );

  this.L27 = ko.computed( () => {
    return this.K27() / this.G15() * 100;
  } );


  // SECTION 2 - Other - Rollups
  this.K35 = ko.computed( () => {
    return this.K22() + this.K23() + this.K24() + this.K25() + this.K26() + this.K27();
  } );

  this.K36 = ko.computed( () => {
    return this.K35() / 60;
  } );

  this.L35 = ko.computed( () => {
    return this.K35() / this.G15() * 100;
  } );

  this.K37 = ko.computed( () => {
    return this.L35() * this.G17() / this.D16() / 100;
  } );


  // SECTION 3 - Academics / Academic Support
  this.C42 = ko.numericObservable( 0 );
  this.C43 = ko.numericObservable( 0 );
  this.C44 = ko.numericObservable( 0 );

  this.D42 = ko.computed( () => {
    return this.C42() / this.G15() * 100;
  } );

  this.D43 = ko.computed( () => {
    return this.C43() / this.G15() * 100;
  } );

  this.D44 = ko.computed( () => {
    return this.C44() / this.G15() * 100;
  } );

  this.C46 = ko.computed( () => {
    return this.C42() + this.C43() + this.C44();
  } );

  this.C46hours = ko.computed( () => {
    return this.C46() / 60;
  } );

  this.D46 = ko.computed( () => {
    return this.C46() / this.G15() * 100;
  } );

  // SECTION 3 - Non-Core Academic
  this.G42 = ko.numericObservable( 0 );
  this.G43 = ko.numericObservable( 0 );
  this.G44 = ko.numericObservable( 0 );

  this.H42 = ko.computed( () => {
    return this.G42() / this.G15() * 100;
  } );

  this.H43 = ko.computed( () => {
    return this.G43() / this.G15() * 100;
  } );

  this.H44 = ko.computed( () => {
    return this.G44() / this.G15() * 100;
  } );

  this.G46 = ko.computed( () => {
    return this.G42() + this.G43() + this.G44();
  } );

  this.G46hours = ko.computed( () => {
    return this.G46() / 60;
  } );

  this.H46 = ko.computed( () => {
    return this.G46() / this.G15() * 100;
  } );

  // SECTION 4 - Academics / Academic Support


  // SECTION 4 - Non-Core Academic
  this.G51 = ko.numericObservable( 0 );
  this.G52 = ko.numericObservable( 0 );
  this.G53 = ko.numericObservable( 0 );

  this.H51 = ko.computed( () => {
    return this.G51() / this.G17() * 100;
  } );

  this.H52 = ko.computed( () => {
    return this.G52() / this.G17() * 100;
  } );

  this.H53 = ko.computed( () => {
    return this.G53() / this.G17() * 100;
  } );

  this.G57 = ko.computed( () => {
    return this.G51() + this.G52() + this.G53();
  } );

  this.H57 = ko.computed( () => {
    return this.G57() / this.G17() * 100;
  } );



  // SECTION 4 - Other
  this.K51 = ko.numericObservable( 0 );
  this.K52 = ko.numericObservable( 0 );
  this.K53 = ko.numericObservable( 0 );
  this.K54 = ko.numericObservable( 0 );
  this.K55 = ko.numericObservable( 0 );

  this.L51 = ko.computed( () => {
    return this.K51() / this.G17() * 100;
  } );

  this.L52 = ko.computed( () => {
    return this.K52() / this.G17() * 100;
  } );

  this.L53 = ko.computed( () => {
    return this.K53() / this.G17() * 100;
  } );

  this.L54 = ko.computed( () => {
    return this.K54() / this.G17() * 100;
  } );

  this.L55 = ko.computed( () => {
    return this.K55() / this.G17() * 100;
  } );

  this.K57 = ko.computed( () => {
    return this.K51() + this.K52() + this.K53() + this.K54() + this.K55();
  } );

  this.L57 = ko.computed( () => {
    return this.K57() / this.G17() * 100;
  } );


  // SECTION 4 - Rollups - Order is important, referencing prior equations
  this.K59 = ko.computed( () => {
    return this.L35() / 100 * this.G17() + this.K57() + this.K57() * this.L35() /
            100; // removed '- this.C57()', no cell equation
  } );

  this.L59 = ko.computed( () => {
    return this.K59() / this.G17() * 100;
  } );

  this.G59 = ko.computed( () => {
    return this.H35() / 100 * this.G17() - this.K57() * this.H35() / 100 - this.K57() *
            this.L35() / 100 + this.G57(); // H37 changed to H35
  } );

  this.H59 = ko.computed( () => {
    return this.G59() / this.G17() * 100;
  } );

  this.C59 = ko.computed( () => {
    return this.D35() / 100 * this.G17() - this.K57() * this.D35() / 100 - this.K57() *
            this.L35() / 100 - this.G57(); // D37 changed to D35
  } );

  this.D59 = ko.computed( () => {
    return this.C59() / this.G17() * 100;
  } );


  // SECTION 5 - Analysis
  this.D64 = ko.computed( () => {
    return this.C35() - this.C46();
  } );

  this.D65 = ko.computed( () => {
    return this.D64() / this.G15() * 100;
  } );

  this.H64 = ko.computed( () => {
    return this.G35() - this.G42() - this.G43();
  } );

  this.H65 = ko.computed( () => {
    return this.H64() / this.G15() * 100;
  } );

  this.L64 = ko.computed( () => {
    return this.K35() + this.C42() + this.C43() + this.G42() + this.G43();
  } );

  this.L65 = ko.computed( () => {
    return this.L64() / this.G15() * 100;
  } );

  this.D68 = ko.computed( () => {
    return this.C59() - this.D46() / 100 * this.C59();
  } );

  this.D69 = ko.computed( () => {
    return this.D68() / this.G17() * 100;
  } );

  this.H68 = ko.computed( () => {
    return this.G59() - this.H46() / 100 * this.G59();
  } );

  this.H69 = ko.computed( () => {
    return this.H68() / this.G17() * 100;
  } );

  this.L68 = ko.computed( () => {
    return this.K59() + this.H46() / 100 * this.G59() + this.D46() / 100 * this.C59();
  } );

  this.L69 = ko.computed( () => {
    return this.L68() / this.G17() * 100;
  } );

  // SECTION 1 - rollup
  this.J17 = ko.computed( () => {
    return this.G15() - ( this.C35() + this.G35() + this.K35() );
  } );
}

function submissionsModel() {
  

  this.submissions = ko.observableArray( [] );

  this.removeSubmission = function( submission ) {
    // e.preventDefault();

    var temp = JSON.parse( localStorage.getItem( "Session" ) || "{}" );

    delete temp[ submission.submissionID ];
    localStorage.setItem( "Session", JSON.stringify( temp ) );
    loadSubmissionsList();
  };

  this.editSubmission = function( submission ) {
    loadSubmission( submission.submissionID );
  };

  this.viewSubmission = function( submission ) {
    var newWindow = window.open();

    newWindow.document.write( JSON.stringify( getSubmission( submission ) ) );

    // window.open( "Document.aspx?ID=" + submission.submissionID + "&offset=" + new Date()
    //   .getTimezoneOffset() / 60 );
    return false;
  };

  this.viewRaw = function( submission ) {
    var newWindow = window.open();

    newWindow.document.write( JSON.stringify( getSubmission( submission.submissionID ) ) );

    return false;
  };

  this.showDateLocal = function( dateString ) {
    var date = new Date( dateString );
  
    return date.toString( "MMMM d, yyyy" ) + " at " + date.toString( "h:mm tt" );
  };
}

function submissionViewModel() {
  this.SubmissionID = ko.observable();
  this.Class = ko.observable();
  this.Teacher = ko.observable();
  this.ClassDuration = ko.numericObservable( 0 );
  this.Observer = ko.observable();
  this.ClassSize = ko.numericObservable( 0 );
  this.StartTime = ko.observable();
  this.EndTime = ko.observable();
  this.LastUpdated = ko.observable();
  this.IsSubmitted = ko.observable();
  this.SubmissionItems = ko.observable();

  this.clearValues = function() {
    // @FIXME
    this.SubmissionID( Math.round( Math.random() * 5000 ) );
    this.Class( "CLASS" );
    this.Teacher( "TEACHER" );
    this.ClassDuration( 4 );
    this.Observer( "OBSERVER" );
    this.ClassSize( 4 );
    this.StartTime( new Date().toISOString() ); /* new moment( new Date().getTime() ).format( "h:mm:ss A" ) */
    this.EndTime( undefined );
    this.LastUpdated( new Date().toISOString() );
    this.IsSubmitted();
    this.SubmissionItems( [] );
  };
}

function isValidRequiredField( fieldReference ) {
  var field = $( fieldReference ),
      fieldValue = $.trim( field.val() );

  if( fieldValue.length == 0 ) {
    field.closest( ".control-group" ).addClass( "error" );
    field.parent().find( "span.help-inline" ).html( "This is a required field" );
  } else {
    field.closest( ".control-group" ).removeClass( "error" );
    field.parent().find( "span.help-inline" ).html( "" );
  }

  return fieldValue.length > 0;
}

function isValidRequiredDropdown( fieldReference ) {
  var field = $( fieldReference + " option:selected" ),
      fieldValue = $.trim( field.val() );

  if( fieldValue.length == 0 ) {
    field.closest( ".control-group" ).addClass( "error" );
    field.parent().find( "span.help-inline" ).html( "This is a required field" );
  } else {
    field.closest( ".control-group" ).removeClass( "error" );
    field.parent().find( "span.help-inline" ).html( "" );
  }

  return fieldValue.length > 0;
}

function isValidRequiredNumericField( fieldReference ) {
  var field = $( fieldReference ),
      fieldValue = $.trim( field.val() ),

      isInvalid = !$.isNumeric( fieldValue ) || $.isNumeric( fieldValue ) && fieldValue <= 0;

  if( isInvalid ) {
    field.closest( ".control-group" ).addClass( "error" );
    field.parent().find( "span.help-inline" ).html( "Enter a number greater than zero" );
  } else {
    field.closest( ".control-group" ).removeClass( "error" );
    field.parent().find( "span.help-inline" ).html( "" );
  }

  return !isInvalid;
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
  var currentInterval = ( new Date().getTime() - ActivityManager.currentActivityStartTime ) / 1000;

  return currentInterval >= ACTIVITYSUBMISSIONTHRESHOLD;
}

function getSubmission( submissionID ) {
  return ( JSON.parse( localStorage.getItem( "Session" ) ) || "{}" )[ submissionID ] || {};
}

function getSubmissionItems( submissionID ) {
  return ( JSON.parse( localStorage.getItem( "Session" ) ) || "{}" )[ submissionID ].SubmissionItems || [];
}

function loadSubmission( submissionID ) {
  $.when( getSubmission( submissionID ), getSubmissionItems( submissionID ) )
    .then( ( s, si ) => {
      ko.mapping.fromJSON( s, {}, ActivityManager.currentSubmissionVm );
      ActivityManager.currentActivityEditVM.items( [] );
      ActivityManager.currentActivityEditVM.items( ko.utils.arrayMap( si, item => {
        console.log( item.StartTime );
        return new ActivityItemEdit( s.SubmissionID,
          si.indexOf( item ),
          ActivityManager.currentActivityEditVM.categoryList[ item.CategoryID - 1 ],
          _.find( ActivityManager.currentActivityEditVM.categoryList[ item.CategoryID - 1 ].Subcategories,
            sc => { return sc.SubcategoryID == item.SubcategoryID; } ),
          item.Description,
          moment( item.StartTime ).format( "h:mm:ss A" ),
          moment( item.EndTime ).format( "h:mm:ss A" ),
          toHHMMSS( item.Duration ),
          ActivityManager.currentActivityEditVM.categoryList );
      } ) );
      // Set newly gened textareas
      var $targetfields = $( "#observationEditForm textarea[data-maxsize]" ); // get INPUTs and TEXTAREAs on page with "data-maxsize" attr defined

      // setformfieldsize( $targetfields );

      $( "#landing" ).fadeOut( FADEINTERVAL, () => {
        $( "#observationEditForm" ).fadeIn( FADEINTERVAL );
      } );
    } );
  ko.mapping.fromJSON( JSON.parse( localStorage.getItem( "Session" ) )[ submissionID ] /* ?.SubmissionItems */, {}, ActivityManager.currentSubmissionVm );
}