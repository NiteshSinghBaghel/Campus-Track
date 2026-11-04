
var semesterid=0;
var instituteStrenghtId = 0;
function studentPersonalInformationData()
{
	$.ajax({
		url :'stu_studentPersonalInformationData.json',
		dataType : 'json',
		async : false,
		success : function(jArray)
		{
			if(jArray.length >0)
			{
				$('#studentName').text(jArray[0]["studentName"]);
				$('#departmentCourseName').text(jArray[0]["departmentCourseName"]);
				$('#semesterName').text(jArray[0]["studentSemesterName"]);
				$('#batchName').text(jArray[0]["studentBatchName"]);
				$('#academicYear').text(jArray[0]["academicYear"]);
				$('#bachSemesterId').val(jArray[0]["bachSemId"]);
				semesterid=jArray[0]["semesterId"];
				instituteStrenghtId =jArray[0]["insituteCourseStrenghitId"];
				displayBlockTeachingTimeTable();
			}
		},
		error : function() {
			jAlert("Something went wrong, Please try after some time","Error");
		}
	});

}


function displayBlockTeachingTimeTable(){
	
	var semesterBatchArr = $('#bachSemesterId').val();
	 $.ajax({
		url : 'loadDistinctBlockTimetableSession.json',
		async : false,
		data : {
			batchSemesterCapacityIds : semesterBatchArr.toString()
		},
		dataType : 'json',
		success : function(jArray) {
			var accordionStr = "";
			$('#accordionDiv').html("");
			$('#accordionStr').html(""); 
			if(jArray!=null && jArray!=undefined && jArray.length>0){
				for(var j=0;j<jArray.length;j++){
					var isFreezed = jArray[j]["freezed"] != undefined ? jArray[j]["freezed"] : false;
					if(isFreezed == true || isFreezed == "true"){
					var head = $.datepicker.formatDate('M dd, yy', new Date(jArray[j]["fromDate"])) +" - "+ $.datepicker.formatDate('M dd, yy', new Date(jArray[j]["toDate"]));
					accordionStr =  	'<h3>'+
											'<input class="btn btn-mini btn-inverse" type="button" id="removeImg-'+ jArray[j]["blockTeachingTimeTableId"] +'" style="cursor: auto; position: relative; float: right; z-index: 1000; margin-top: 3px; margin-right: 10px; display: '+(isFreezed == true || isFreezed == 'true' ? 'none;' : '')+'" value="Delete" onclick="removeBlock(this)">'+
											'<a href="#" onclick="loadTimetableInTab('+jArray[j]["blockTeachingTimeTableId"]+', \''+semesterBatchArr.toString()+'\',\''+$.datepicker.formatDate('M dd, yy', new Date(jArray[j]["fromDate"]))+'\', \''+$.datepicker.formatDate('M dd, yy', new Date(jArray[j]["toDate"]))+'\' );">'+ head +'</a></h3>'+
									    	'<div id="accordionContaint_'+ jArray[j]["blockTeachingTimeTableId"] +'" isfreezed="'+jArray[j]["freezed"]+'"> </div>';
					
					$('#accordionDiv').append(accordionStr);
					$('#accordionContaint_'+ jArray[j]["blockTeachingTimeTableId"]).data('blockTeachingTimeTableId', jArray[j]["blockTeachingTimeTableId"]);
				}
				}
			}
			else{
				$('#accordionDiv').html("");
			}
			
			$('#accordionDiv').accordion('destroy');
			$('#accordionDiv').accordion({ header: "h3",
		   	 autoHeight: false, collapsible: true, active:false
			});
			$('#accordionDiv').show();
		},
		error : function() {
			return;
		}
	});
}


function convertTo12Hr(time24Hr) {
	if (time24Hr.split(":").length == 2) {
		var hour = eval(time24Hr.split(":")[0]);
		var min = eval(time24Hr.split(":")[1]);
		var amPm = "AM";
		
		if(hour >= 12)
			amPm = "PM";
		
		if (hour > 12)
			hour = hour - 12;
		
		
		if (hour < 10)
			hour = "0" + eval(hour);

		if (hour == "00") {
			hour = "12";
			amPm = "AM";
		}

		if (min < 10)
			min = "0" + eval(min);

		return hour + ":" + min + " " + amPm;
	} else {
		return "";
	}
}
function generatePlanningPdf(blockTeachingTimeTableId,semesterBatchArr)
	{
		var subjectName="";
		var courseName=$('#departmentCourseName').text();
		var acadmicYear=$('#academicYear').text();

		var semesterId = semesterid;
		var instituteCoursestrengthId = instituteStrenghtId;
		
		window.location.replace('generatePlanningTimeTablePDf.json?blockTeachingTimeTableId='+blockTeachingTimeTableId+'&semesterBatchArr='+semesterBatchArr+'&semesterId='+semesterId+'&instituteCoursestrengthId='+instituteCoursestrengthId+'&subjectName='+subjectName+'&courseName='+courseName+'&acadmicYear='+acadmicYear);
	}

function loadTimetableInTab(blockTeachingTimeTableId, semesterBatchArr, frmDate,toDate){
	$('#accordionContaint_'+blockTeachingTimeTableId).html('');
	var isFreezed = $('#accordionContaint_'+blockTeachingTimeTableId).attr('isfreezed') != undefined && $('#accordionContaint_'+blockTeachingTimeTableId).attr('isfreezed') == 'true' ? true : false;

	var boiler = '<div><div class="btn btn-mini btn-inverse" id="btn_displayBlockTeachingTimetable_'+blockTeachingTimeTableId+'">Get Timetable</div>&nbsp;&nbsp;'+
	'<div id="btn_displayBlockTeachingTimetable_'+blockTeachingTimeTableId+'" class="btn btn-mini" onclick="generatePlanningPdf(\''+blockTeachingTimeTableId+'\',\''+semesterBatchArr+'\')">Generate Pdf</div>&nbsp;&nbsp;';
	
	
	boiler+='<br><div class="div_accordionContaint" id="div_accordionContaint_'+blockTeachingTimeTableId+'"></div>';
	$('#accordionContaint_'+blockTeachingTimeTableId).html(boiler);
	$('#btn_displayBlockTeachingTimetable_'+blockTeachingTimeTableId).bind('click', function(){
		displayDaysOfWeek(blockTeachingTimeTableId);
		
		$('#btn_PrintTimetablePDF_'+blockTeachingTimeTableId).show();
	});
	/*$('#btn_PrintTimetablePDF_'+blockTeachingTimeTableId).bind('click', function(){
		displaySectionsForTimetablePdf(blockTeachingTimeTableId);
	});*/
}


function displayDaysOfWeek(blockTeachingTimeTableId){
	 
	$('#div_accordionContaint_'+blockTeachingTimeTableId).html('');
	$('.div_accordionContaint').html();
	$('#divTimetableAdjustment_withoutSections').html('');
	var timeObjectArr = {};
	timeObjectArr = getTimeSlotsForTemetable_planning(blockTeachingTimeTableId);
	var boiler = '<table class="table table-bordered "><thead><tr><th style="width: 100px; " id="th_firstBlankHeading_planning"></th>';
	for (var p in timeObjectArr) {
		boiler += '<th id="th_timeSlot_planning_'+(timeObjectArr[p].replace(/ /g, '_')).replace(/\:/gi, '_')+'"' +
		' class="th_timeSlot_Heading_planning" style="background-color: black; color: white; text-align: center; width: 150px;">'+
		'	<div class="div_actionBtn_planning" style="float:left; display:none;"></div><div class="div_heading_timeSlot_planning">'+timeObjectArr[p]+'</div></th>';
	}
	
	var isFreezed = $('#accordionContaint_'+blockTeachingTimeTableId).attr('isfreezed') != undefined && $('#accordionContaint_'+blockTeachingTimeTableId).attr('isfreezed') == 'true' ? true : false;  
	
	boiler += '</tr></thead><tbody id="tbody_batchWiseTimeTable_planning"></tbody></table>'+
	'<br><div align="center">'+
	'&nbsp;&nbsp;<input id="freezeTimeTableBtnId_'+blockTeachingTimeTableId+'" class="btn btn-inverse btn-mini" type="button"'+
	' value="Publish Timetable" onclick="freezeTimeTableForReplication('+blockTeachingTimeTableId+');" style="margin-top:20px; display:'+(isFreezed == true ? 'none;' : '')+'">'+
	'</div>';
	$('#div_accordionContaint_'+blockTeachingTimeTableId).html(boiler);
	var isFreezed = $('#accordionContaint_'+blockTeachingTimeTableId).attr('isfreezed') != undefined && $('#accordionContaint_'+blockTeachingTimeTableId).attr('isfreezed') == 'true' ? true : false;
	
	var weekDays;
	if($('#customerHelper').val() == 'IMT_DUBAI'){
		weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	}else{
		weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday","Sunday"];
	}
	
	for(var i = 0; i <= 6; i++)
	{
		
		boiler = '<tr><th style="vertical-align:middle; width: 100px;" id="td_planning_'+weekDays[i]+'">'+
		'<span><b class="date">'+weekDays[i]+'</span><span id="span_dayHolidayInfo_'+blockTeachingTimeTableId+'_'+i+'"></span></th>';
		for (var p in timeObjectArr) {
			boiler += '<td id="td_dayBatchTimeSlot_planning_'+(timeObjectArr[p].replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[i]+'" '+
			' class="td_dayBatchTimeSlot_planning td_dayBatchTimeSlot_planning_'+weekDays[i]+' '+
			' td_dayBatchTimeSlot_planning_'+(timeObjectArr[p].replace(/ /g, '_')).replace(/\:/gi, '_')+'" '+
			' stime="'+timeObjectArr[p]+'" sid="'+p+'" lday="'+weekDays[i]+'" title="Double Click to Edit"></td>';
		}
		boiler +='</tr>';
		$('#tbody_batchWiseTimeTable_planning').append(boiler);
		$('#tbody_batchWiseTimeTable_planning tr:last').data('weekDay', i);
		$('#tbody_batchWiseTimeTable_planning tr:last').data('semesterBatchId', 0);
		$('#tbody_batchWiseTimeTable_planning tr:last').data('lectureDay', weekDays[i]);
		$('#tbody_batchWiseTimeTable_planning tr:last').find('.td_dayBatchTimeSlot_planning').data('batchSemesterCapacityId', 0);
	}
	
	
	
	getAllBatchesPlannedTimeTable(blockTeachingTimeTableId);
	//getHolidaysInfoForTimeTablePlanning(blockTeachingTimeTableId);
	$('.th_timeSlot_Heading_planning').each(function(){
		var src = this; 
		var tTimeSlot = $(src).find('.div_heading_timeSlot_planning').html();
		var tFlag = false;
		$('.td_dayBatchTimeSlot_planning_'+(tTimeSlot.replace(/ /g, '_')).replace(/\:/gi, '_')).each(function(){
			if($(this).data('cellData') != undefined && $(this).data('cellData') != '')
				tFlag = true;
		});
		if(tFlag == true){
			$(src).find('.div_actionBtn_planning').show();
		}
	});
}

function getTimeSlotsForTemetable_planning(blockTeachingTimeTableId){
	var timeObjectArr = {};
	$.ajax({
		url : 'getTimeSlotsForTemetableFromPlannedTimetable.json?batchSemesterCapacityIds=0&blockTeachingTimeTableId='+blockTeachingTimeTableId+'&isWithSection=false',
			dataType : 'json',
			async : false,
			success : function(jArray) {
				if(jArray.length > 0){
					for(var i = 0; i < jArray.length; i++){
						timeObjectArr[i] = jArray[i].slot;
					}
				}				
			},
			error : function() {
			}
	});
	return timeObjectArr;
}


function getAllBatchesPlannedTimeTable(blockTeachingTimeTableId){
	$.ajax({
		url:'fetchPlannedTimeTableforAllBatches.json',
		data: {
			batchSemesterCapacityIds : 0, blockTeachingTimeTableId : blockTeachingTimeTableId,
			isWithSection : false
		},
		async:false,
		beforeSend: function() {
			startCommonAjaxSpinner();
		},
		complete: function() {
			stopCommonAjaxSpinner();
		},
		dataType:'json',
		success:function(jObj){
		
				var plannedTimetable = jObj.plannedTimetable;
				var weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
				for ( var j = 0; j < plannedTimetable.length; j++) {
					var batchSemesterCapacityId = plannedTimetable[j].batchSemesterCapacityId;
					var cellData = new Array();
					var timetableCellBoiler = "";
					var sub = plannedTimetable[j]["sub"];
					var employeeId = plannedTimetable[j]["employeeId"];
					var employeeNameAbbr = plannedTimetable[j]["employeeNameAbbr"];
					var subShortName = plannedTimetable[j]["subShortName"].gemsDecode();
					var uniqueCellId = plannedTimetable[j]["uniqueCellId"];
					var subjectId = plannedTimetable[j]["subjectId"];
					var subjectWisebatchId = plannedTimetable[j]["subjectWisebatchId"];
					var parentSubjectWisebatchId = plannedTimetable[j]["parentSubjectWisebatchId"];
					var duration = plannedTimetable[j]["duration"];
					var infraId = plannedTimetable[j]["infraId"];
					var infraDisplayName = plannedTimetable[j]["infraDisplayName"];
					var tempLectureTime = '';
					var startTime = plannedTimetable[j]["startTimeHM"];
					var endTime = plannedTimetable[j]["endTimeHM"];
					tempLectureTime = convertTo12Hr(startTime)+'-'+convertTo12Hr(endTime);
					var recess = plannedTimetable[j]["recess"];
					var subBatchName = plannedTimetable[j]["subBatchName"];
					var blockId = plannedTimetable[j]["blockId"];
					var lecType = plannedTimetable[j]["lecType"];
					var lptType = plannedTimetable[j]["lptType"];

					var lecDesc = plannedTimetable[j]["lecDesc"];
					var lDay = plannedTimetable[j]["day"]; 
					var instituteCourseBatchSemesterTimeTableId = plannedTimetable[j]["instituteCourseBatchSemesterTimeTableId"];
					subShortName = (plannedTimetable[j]["recess"] == undefined ? subShortName
							: plannedTimetable[j]["recess"]);
					var rmId = plannedTimetable[j]["rmId"];
					var tSubjectIdArray = new Array();
					tSubjectIdArray.push(subjectId.split('-')[0]);
					var vData = {
							instituteCourseBatchSemesterTimeTableId : instituteCourseBatchSemesterTimeTableId,
							timetableId : uniqueCellId,
							employeeNameAbbr : employeeNameAbbr,
							employeeId : employeeId,
							infraId : infraId,
							infraDisplayName : infraDisplayName,
							subjectId : subjectId,
							subjectwiseBatchId : subjectWisebatchId,
							parentSubjectWisebatchId : parentSubjectWisebatchId,
							startTime : startTime,
							endTime : endTime,
							subFullName : sub,
							subBatchName : subBatchName,
							duration : duration,
							recess : recess,
							lecType : lecType,
							lptType : lptType,
							lecDesc : lecDesc,
							type : "newAdded",
							blockId : blockId,
							rmId : rmId,
							day : lDay,
							semesterBatchId : 0
					};
					cellData.push(vData);

					for ( var m = 0; cellData.length > m; m++) {
						var breakStyle = '';
						if (cellData[m].recess != "") {
							breakStyle = 'background-color:#EADBC4';	
						}
						timetableCellBoiler = '<div class="timetableAdjustedCell" style="'+breakStyle+'">';
						if (cellData[m].recess == "") {
							if(m > 0)
								timetableCellBoiler += '<b style="text-decoration: overline;">  <font style="color :#DD4B39;cursor:pointer;">'+ cellData[m].subjectId.split("-")[1]+ '</font> ';
							else
								timetableCellBoiler += '<b> <font style="color :#DD4B39;cursor:pointer;">'+ cellData[m].subjectId.split("-")[1]+ '</font> ';
							
							if (cellData[m].subBatchName != "")
								timetableCellBoiler += "["+ cellData[m].subBatchName + "]";

							if (cellData[m].infraId != "")
								timetableCellBoiler += ' <font style="color: #1155CC;cursor:pointer;"> ['+ cellData[m].infraDisplayName.split("$")[1]+ '] </font>';
							timetableCellBoiler += '</b><b>'+(lecDesc != undefined && lecDesc != '0' ? '['+lecDesc+']' : '')+'</b><br>';
							showTime = true;
						} else {
							timetableCellBoiler += ' <font style="color :#DD4B39">'+ cellData[m].recess + '</font><br> ';
							showTime = true;
						}
					}
					timetableCellBoiler += '</div>';
					
					$('#td_dayBatchTimeSlot_planning_'+(tempLectureTime.replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[lDay]).append(timetableCellBoiler);
					if($('#td_dayBatchTimeSlot_planning_'+(tempLectureTime.replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[lDay]).data("cellData") != undefined){
						var tempCellData = $('#td_dayBatchTimeSlot_planning_'+(tempLectureTime.replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[lDay]).data("cellData");
						for(var tcnt = 0; tcnt < tempCellData.length; tcnt++){
							cellData.push(tempCellData[tcnt]);
							tSubjectIdArray.push(tempCellData[tcnt].subjectId.split('-')[0]);
						}
					}
					$('#td_dayBatchTimeSlot_planning_'+(tempLectureTime.replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[lDay]).data("cellData", cellData);
					$('#td_dayBatchTimeSlot_planning_'+(tempLectureTime.replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[lDay]).data("batchSemesterCapacityId", 0);
					
					$('#td_dayBatchTimeSlot_planning_'+(tempLectureTime.replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[lDay]).find('.viewStudentSubjectConflict').remove();
					if(cellData.length > 1 && tSubjectIdArray.length > 1){
						$('#td_dayBatchTimeSlot_planning_'+(tempLectureTime.replace(/ /g, '_')).replace(/\:/gi, '_')+'_'+weekDays[lDay]).append('<span class="viewStudentSubjectConflict"><a href ="javascript:void(0)" onclick="viewStudentSubjectConflicts_inPlannning(this)" title="View student conflicts">View Conflicts</a></span>');
					}
					cellData = new Array();
				}
				//checkConflictsAndRemoveConflictLink();
			}
	});
}

