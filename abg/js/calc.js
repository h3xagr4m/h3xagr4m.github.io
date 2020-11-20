function loadPreference () {
	savedPreference = sessionStorage.getItem("arterialbloodgas.com");
	unitPreference = JSON.parse(savedPreference);
	if (unitPreference == [".SI-toggle"]) {
		unitToggle(".SI-toggle",".US-toggle",'.SI','.US',0.133322368,0.01,"kPa");
    }
};

function rememberPreference (unit) {
	unitPreference = JSON.stringify(unit);
	sessionStorage.setItem("arterialbloodgas.com",unitPreference);
};

//declaring disorders
var respiratoryAcidosis = "Respiratory acidosis";
var respiratoryAlkalosis = "Respiratory alkalosis";
var metabolicAcidosis = "Metabolic acidosis <button type='button' class='checkanion'>Check Anion Gap</button>";
var metabolicAlkalosis = "Metabolic alkalosis";
var noDisorder = "None";

//initial variables
var conversionFactor = 1;
var primary = "";
var secondary = "";
var onset = "";
var error_present = false;

//Toggle between US and SI units
function unitToggle (thisUnitToggle, otherUnitToggle,thisUnitClass,otherUnitClass,conversionRate,stepDecimal,unitSuffix) {
    $(thisUnitToggle).addClass('active');
    $(thisUnitToggle).css("background-color","#247D70");
    $(thisUnitClass).show();
    $(otherUnitClass).hide();
    $(otherUnitToggle).removeClass('active');
    $(otherUnitToggle).css("background-color", "#34B3A0");
    $('#PaCO2, #PaO2').attr("step", stepDecimal);
    units = unitSuffix;
    conversionFactor = conversionRate;
    rememberPreference(thisUnitToggle);
    $('#pH').focus();
};

function respiratoryStatus(status) {
	$('.respiratory').append("<p class='result'><strong>Respiratory Status:</strong> " + status + "</p>");
};

function alveolarArterialGradient(age,FiO2,PaO2,PaCO2) {
	var PAO2 = FiO2 * (760-47) - (PaCO2 / 0.8);
	var gradient = PAO2 - PaO2;
    if ( gradient >= 0 ) {
    	var upperLimit = age / 4 + 4;
    	if (gradient > upperLimit) {
    		var result = "Elevated";
    	} else {
    		var result = "Normal";
    	}
    	$('.respiratory').append("<p class='result'><strong>A-a Gradient:</strong> "+ result + " for age group <span class='badge'>" + gradient.toFixed(0) + "mmHg</span></p>");
    } else {
        $('.respiratory').append("<p class='result'><strong>A-a Gradient:</strong> The result is a negative value. This is incorrect. Was the patient on a different FiO<sub>2</sub> before or when the sample was taken? Otherwise a technical or transcription error might have occurred.</p>");
    }
};

//Get initial values on form submission
function getStandardisedValues(analyte,requiresConversion) {
    inputField = "input[name=" + analyte + "]";
    analyteValue = parseFloat($(inputField).val());
    if (requiresConversion) {
        analyteValue /= conversionFactor;
    }
    return analyteValue.toFixed(1);
};

//Respiratory disorder onset
function respiratoryOnset(calculatedH,PaCO2Change) {
    var onsetRatio = Math.abs( (40 - calculatedH) / ( PaCO2Change ) );
    if (onsetRatio < 0.3) {
        return "Chronic";
    } else if (onsetRatio > 0.8) {
        return "Acute";
    } else {
        return "Acute on chronic";
    }
};

//Respiratory acidosis compensation calculation
function respiratoryAcidosisCompensation(onset,PaCO2Change,HCO3) {
    if (onset === "Chronic") {
        var expectedHCO3 = Math.round(3.5 * PaCO2Change / 10 + 24);
        if (HCO3 > expectedHCO3) {
            return metabolicAlkalosis;
        } else if (HCO3 < expectedHCO3) {
            return metabolicAcidosis;
        } else {
            return noDisorder;
        }
    } else {
        var expectedHCO3 = Math.round(PaCO2Change / 10 + 24);
        if (HCO3 > expectedHCO3 + 3) {
            return metabolicAlkalosis;
        } else if (HCO3 < expectedHCO3 - 3) {
            return metabolicAcidosis;
        } else {
            return noDisorder;
        }
    }
};

//Respiratory alkalosis compensation calculation
function respiratoryAlkalosisCompensation(onset,PaCO2Change,HCO3) {
    if (onset === "Chronic") {
        var expectedHCO3 =  Math.round(PaCO2Change / 10);
        var expectedHCO3High = 24 - expectedHCO3 * 5;
        var expectedHCO3Low = 24 - expectedHCO3 * 7;
        if (HCO3 > expectedHCO3High) {
            return metabolicAlkalosis;
        } else if (HCO3 < expectedHCO3Low) {
            return metabolicAcidosis;
        } else {
            return noDisorder;
        }
    } else {
        var expectedHCO3 = Math.round(24 - 2 * PaCO2Change / 10);
        if (HCO3 > expectedHCO3) {
            return metabolicAlkalosis;
        } else if (HCO3 < expectedHCO3) {
            return metabolicAcidosis;
        } else {
            return noDisorder;
        }
    }
};

//Metabolic acidosis compensation calculation
function metabolicAcidosisCompensation(HCO3,PaCO2) {
    var expectedPaCO2 = Math.round((1.5 * HCO3) + 8);
    if (PaCO2 > (expectedPaCO2 + 2)) {
        return respiratoryAcidosis;
    } else if (PaCO2 < (expectedPaCO2 - 2)) {
        return respiratoryAlkalosis;
    } else {
        return noDisorder;
    }
};

//metabolic alkalosis compensation calculation
function metabolicAlkalosisCompensation(HCO3Change,PaCO2) {
    var expectedPaCO2 = Math.round(40 + 0.6 * HCO3Change);
    if (PaCO2 > expectedPaCO2) {
        return respiratoryAcidosis;
    } else if (PaCO2 < expectedPaCO2) {
        return respiratoryAlkalosis;
    } else {
        return noDisorder;
    }
};

//ABG values lead to error
function error() {
    error_present = true;
    return "Unable to ascertain a primary disorder. Please reconsider the validity of your sample.";
};
//we position and size modal according to window size
function setAnionGapModalPosition() {
	$('.aniongap-modal').css("top", ( $(window).height() - $('.aniongap-modal').height() ) * 0.3 );
	width = setAnionGapModalWidth($(window).width());
	$('.aniongap-modal').width(width);
	$('.aniongap-modal').css("left", ( $(window).width() - width ) * 0.5  );
};
//Calculate modal width
function setAnionGapModalWidth (window) {
	if ( window < 620  ) {
		width = window * 0.85;
	} else {
		width = 600;
	}
	return width;
};

function albuminPlaceholder (width) {
	if ( width >= 755 ) {
		$('#albumin').attr("placeholder","");
	} else {
		$('#albumin').attr("placeholder","Only add if low");
	}
};

function closeAnionModal(event) {
	event.preventDefault();
    preventDoubleSubmissionOnPressingEnter();
	$('.aniongap-modal').fadeOut();
	$('.mask').css({'width': '0', 'height': '0' });
	$(window).off('resize');
};

function preventDoubleSubmissionOnPressingEnter() {
    $(this).keypress(function(event) {
        if (event.which == 13 ) {
            event.preventDefault();
        }
    });
};

$(document).ready(function(){

	$('input[type=number]').val("");
    $('#age').focus();
    //setting analyte units
    $('.SI').hide();
    loadPreference();
    var units = "mmHg";
    $('.SI-toggle').click(function(){
        unitToggle(".SI-toggle",".US-toggle",'.SI','.US',0.133322368,0.01,"kPa");
    });
    $('.US-toggle').click(function(){
        unitToggle(".US-toggle",".SI-toggle",'.US','.SI',1,0.1,"mmHg");
    });

    //validating FiO2 input
    $('#FiO2').change(function(){
    	var input = $(this).val()
    	if ( input > 1) {
    		$(this).val(input / 100);
    	}
    });

    $('form[name=abgcalc]').submit(function(event){
        event.preventDefault();
        preventDoubleSubmissionOnPressingEnter();
        $('#units').hide();

        //setting analyte values
        var pH = getStandardisedValues("pH",false);
        var PaO2 = getStandardisedValues("PaO2",true);
        var FiO2 = getStandardisedValues("FiO2",false);
        var PaCO2 = getStandardisedValues("PaCO2",true);
        var HCO3 = getStandardisedValues("HCO3",false);
        var age = getStandardisedValues("age",false);

        //calculating analyte percentage changes
        var PaCO2Change = Math.abs(PaCO2 - 40);
        var HCO3Change = Math.abs(24 - HCO3);
        var PaCO2PercentageChange = PaCO2Change / 40;
        var HCO3PercentageChange = HCO3Change / 24;

        //tabulating user's inputs
        if (conversionFactor == 1) {
        	anionUnits = "mEq/L";
        	albuminUnits = "g/dL";
        } else {
        	anionUnits = "mmol/L";
        	albuminUnits = "g/L";
        }
        $('.submitted-values').append("<div class='values-row'>\
                                            <div class='row'>\
                                            	<div class='col-xs-6 col-sm-2 submitted-value'>\
                                                    Age <span class='badge'> " + Math.round(age) + " </span>\
                                                </div>\
                                                <div class='col-xs-6 col-sm-2 submitted-value'>\
                                                    pH <span class='badge'> " + pH + " </span>\
                                                </div>\
                                                <div class='col-xs-6 col-sm-2 submitted-value'>\
                                                    P<sub>a</sub>O<sub>2</sub> <span class='badge'>" + (PaO2 * conversionFactor).toFixed(1)  + units + "</span>\
                                                </div>\
                                                <div class='col-xs-6 col-sm-2 submitted-value'>\
                                                    FiO<sub>2</sub> <span class='badge'>" + FiO2 + "</span>\
                                                </div>\
                                                <div class='col-xs-6 col-sm-2 submitted-value'>\
                                                    P<sub>a</sub>CO<sub>2</sub> <span class='badge'>" + (PaCO2 * conversionFactor).toFixed(1) + units + "</span>\
                                                </div>\
                                                <div class='col-xs-6 col-sm-2 submitted-value'>\
                                                    HCO<sub>3</sub><sup>-</sup> <span class='badge'>" + HCO3 + anionUnits + "</span>\
                                                </div>\
                                            </div>\
                                        </div>");
        //checking validity of sample
        var calculatedH = (24 * PaCO2) / HCO3;
        var calculatedpH = parseFloat(((-Math.log10(calculatedH / 1000000000)).toFixed(2)));
        if (pH !== calculatedpH) {
            $('.validity').addClass('alert alert-danger');
            $('.validity').html("<strong>Caution: </strong>Calculated pH is " + calculatedpH + " using a modified Henderson-Hasselbach equation. If this differs significantly from the ABG pH then your ABG might be invalid.");
        }
        //assessing respiratory status
        if ( PaO2 < 60 ) {
        	if (PaCO2 > 45) {
        		respiratoryStatus("Type 2 Respiratory Failure");
        	} else {
        		respiratoryStatus("Type 1 Respiratory Failure");
        	}
        } else {
	        if ( PaCO2 > 45 ) {
	        	respiratoryStatus("Hypercapnia");
	        } else if ( PaCO2 <  35 ) {
	        	respiratoryStatus("Hypocapnia");
	        } else {
	        	respiratoryStatus("Normal");
	        }
	    }

       	alveolarArterialGradient(age,FiO2,PaO2,PaCO2);

       	//adding PaO2/FiO2 ratio
       	$('.respiratory').append("<p class='result'><strong>P<sub>a</sub>O<sub>2</sub>/FiO<sub>2</sub> ratio:</strong> <span class='badge'>" + (PaO2 / FiO2).toFixed(0) + "</span></p>");

        //acidaemia pathway
        if (pH < 7.35) {
                if (PaCO2 > 45 && (HCO3 >= 22 || PaCO2PercentageChange > HCO3PercentageChange)) {
                    primary = respiratoryAcidosis;
                    onset = respiratoryOnset(calculatedH,PaCO2Change);
                    secondary = respiratoryAcidosisCompensation(onset,PaCO2Change,HCO3);
                } else if (HCO3 < 22 && (PaCO2 <= 45 || PaCO2PercentageChange < HCO3PercentageChange)) {
                    primary = metabolicAcidosis;
                    secondary = metabolicAcidosisCompensation(HCO3,PaCO2);
                } else if (PaCO2 <= 45 && HCO3 >= 22) {
                    primary = error();
                } else {
                    primary = "Equal respiratory and metabolic acidosis";
                    secondary = noDisorder;
                }
        //alkalaemia pathway
        } else if (pH > 7.45) {
                if (PaCO2 < 35 && (HCO3 <= 26 || PaCO2PercentageChange > HCO3PercentageChange)) {
                    var primary = respiratoryAlkalosis;
                    onset = respiratoryOnset(calculatedH,PaCO2Change);
                    secondary = respiratoryAlkalosisCompensation(onset,PaCO2Change,HCO3);
                } else if (HCO3 > 26 && (PaCO2 >= 35 || PaCO2PercentageChange < HCO3PercentageChange)) {
                    var primary = metabolicAlkalosis;
                    secondary = metabolicAlkalosisCompensation(HCO3Change,PaCO2);
                } else if (PaCO2 >= 35 && HCO3 <= 26) {
                    primary = error();
                } else {
                    var primary = "Equal respiratory and metabolic alkalosis";
                }
        //normal pH pathway
        } else {
            if (PaCO2 > 45 || HCO3 > 26) {
                if (PaCO2PercentageChange > HCO3PercentageChange){
                    primary = respiratoryAcidosis;
                    secondary = "Metabolic alkalosis (fully compensating)";
                } else if (PaCO2PercentageChange < HCO3PercentageChange) {
                    primary = metabolicAlkalosis;
                    secondary = "Respiratory acidosis (fully compensating)";
                } else {
                    primary = "Equal respiratory acidosis and metabolic alkalosis";
                    secondary = noDisorder;
                }
            } else if (PaCO2 < 35 || HCO3 < 22) {
                if (PaCO2PercentageChange > HCO3PercentageChange){
                    primary = respiratoryAlkalosis;
                    secondary = "Metabolic acidosis (fully compensating)";
                } else  if (PaCO2PercentageChange < HCO3PercentageChange) {
                    primary = metabolicAcidosis;
                    secondary = "Respiratory alkalosis (fully compensating)";
                } else {
                    primary = "Equal respiratory alkalosis and metabolic acidosis";
                    secondary = noDisorder;
                }
            } else {
                primary = "There is no acid-base disturbance";
                secondary = noDisorder;
            }
        }
        //We display acid-base result to page
        if (secondary != noDisorder && error_present == false) {
        	$(".acidbase-results").append("<p class='result'><strong>Primary:</strong> " + primary + "</p>");
        	$(".acidbase-results").append("<p class='result'><strong>Secondary:</strong> " + secondary + "</p>");
        } else {
        	$(".acidbase-results").append("<p class='result'>" + primary + "</p>");
        }
        if (onset != "" && error_present == false && (primary == respiratoryAlkalosis || primary == respiratoryAcidosis)) {
            $(".acidbase-results").append("<p class='result'><strong>Respiratory Onset:</strong> " + onset + "</p>")
        }
        //shows anion gap modal
        $('.checkanion').click(function(){
        	$('#submitanion input[type=number]').val("");
        	$('.aniongap-modal .input-group-addon').empty();
            setAnionGapModalPosition();
            $('.electrolyte-addon').append(anionUnits);
            $('.albumin-addon').append(albuminUnits);
            albuminPlaceholder( $(window).width() );
            $('.mask').css({'width': '100%', 'height': '100%' });
            $('.aniongap-modal').fadeIn();
            $('#sodium').focus();
            //we change size of anion gap modal if viewport size changes
			$(window).on('resize',function() {
				windowWidth = $(window).width();
				setAnionGapModalPosition();
				albuminPlaceholder( windowWidth );
				var $specifyColumn = $("#submitanion .col-sm-4")
				if ( $specifyColumn.hasClass("col-xs-6") && windowWidth < 520 ) {
					$specifyColumn.addClass('col-xs-12').removeClass('col-xs-6');
					$('.aniongap-modal').height(440);
				}
				if ( $specifyColumn.hasClass("col-xs-12") && windowWidth > 520 ) {
					$specifyColumn.addClass('col-xs-6').removeClass('col-xs-12');
					$('.aniongap-modal').height(360);
				}
			});
        });
        //closes anion gap modal
        $('#closeanion').click(function(event){
        	closeAnionModal(event);
        });
        //anion gap calculations
        $('#submitanion').submit(function(event){
        	closeAnionModal(event);
        	$('.checkanion').hide();
        	//storing anion gap form inputs
            var sodium = parseInt($('#sodium').val());
            var chloride = parseInt($('#chloride').val());
            var inputtedAlbumin = parseInt($('#albumin').val());
            if ( conversionFactor == 1 ) {
            	var albumin = inputtedAlbumin;
            } else {
            	var albumin = inputtedAlbumin / 10;
            }
            //calculating anion gap depending on albumin level and tabulating submitted values
            if ( isNaN(albumin) ) {
            	var anionGapValue = sodium - chloride - HCO3;
            	$('.values-row .row').append("<div class='hidden-xs col-sm-3'></div>\
            								<div class='col-xs-6 col-sm-3 submitted-value'>\
	                                            Na<sup>+</sup> <span class='badge'>" + sodium + anionUnits + "</span>\
	                                        </div>\
	                                        <div class='col-xs-6 col-sm-3 submitted-value'>\
	                                            Cl<sup>-</sup> <span class='badge'>" + chloride + anionUnits + "</span>\
	                                        </div>\
	                                        <div class='hidden-xs col-sm-3'></div>");
            } else {
            	var anionGapValue = Math.round( (sodium - chloride - HCO3) + (2.5 * (4 - albumin) ) );
            	$('.values-row .row').append("<div class='col-xs-6 col-sm-4 submitted-value'>\
	                                            Na<sup>+</sup> <span class='badge'>" + sodium + anionUnits + "</span>\
	                                        </div>\
	                                        <div class='col-xs-6 col-sm-4 submitted-value'>\
	                                            Cl<sup>-</sup> <span class='badge'>" + chloride + anionUnits + "</span>\
	                                        </div>\
	                                        <div class='col-xs-6 col-sm-4 submitted-value'>\
	                                            Albumin <span class='badge'>" + inputtedAlbumin + albuminUnits + "</span>\
	                                        </div>");
            }
			//analysing anion gap result
            if (anionGapValue > 12) {
                anionGapRatio = (anionGapValue - 12) / (24 - HCO3);
                var anionGap = "High anion gap <span class='badge'>" + anionGapValue + anionUnits + "</span> - ";
                if (anionGapRatio > 2) {
                    var anionGap = anionGap + "a concurrent metabolic alkalosis is likely to be present";
                } else if (anionGapRatio < 1) {
                    var anionGap = anionGap + "a concurrent normal anion-gap metabolic acidosis is likely to be present";
                } else {
                    var anionGap = anionGap + "pure anion gap acidosis";
                }
            } else if (anionGapValue < 4) {
            	var anionGap = "Low anion gap <span class='badge'>" + anionGapValue + anionUnits + "</span>";
            } else {
                var anionGap = "Normal anion gap <span class='badge'>" + anionGapValue + anionUnits + "</span>";
            }
            //putting anion gap analysis to page
            $(".acidbase-results").append("<p class='result'><strong>Anion Gap:</strong> " + anionGap + "</p>");
            if ( isNaN(albumin) && anionGapValue <= 12) {
                $(".acidbase-results").append("<p class='result'><span class='glyphicon glyphicon-minus-sign'></span> In patients with hypoalbuminemia the normal anion gap is lower than 12mmol/L - in these patients the anion gap is about 2.5 mEq/L lower for each 1 gm/dL decrease in the plasma albumin concentration </p>");
            }
            if (anionGapValue > 12) {
                $(".acidbase-results").append("<p class='result'><span class='glyphicon glyphicon-minus-sign'></span>  Consider calculating the osmolal gap if the anion gap cannot be explained by an obvious cause or if toxic ingestion is suspected.</p>");
                if ( isNaN(albumin) ) {
                	$(".acidbase-results").append("<p class='result'><span class='glyphicon glyphicon-minus-sign'></span>  The disorder suggested after the anion gap value is based on variability from normal anion gap - thus this will not be accurate for patients with hypoalbuminemia as their normal anion gap is lower than 12mmol/L - in these patients the anion gap is about 2.5 mEq/L lower for each 1 gm/dL decrease in the plasma albumin concentration </p>");
                }
            }
        });
        $("#abgcalc > .row").slideUp("600");
        $("#abgcalc").addClass("container").removeClass("container-fluid");
        $("#results").slideDown("600");
        //goes to home page
        $('#reanalyse').click(function(){
        	window.location = "index.html";
        });
    });
});