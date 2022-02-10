// HOLY SHIT THIS WAS GRABBED FROM STACKOVERFLOW
export function toHHMMSS( val ) {
  var millisec_numb = val,
      sec_numb = millisec_numb / 1000,
      hours = Math.floor( sec_numb / 3600 ),
      minutes = Math.floor( ( sec_numb - hours * 3600 ) / 60 ),
      seconds = sec_numb - hours * 3600 - minutes * 60;

  if( hours < 10 ) hours = "0" + hours;
  if( minutes < 10 ) minutes = "0" + minutes;
  if( seconds < 10 ) seconds = "0" + seconds;
  var time = hours + ":" + minutes + ":" + seconds;

  return time;
}