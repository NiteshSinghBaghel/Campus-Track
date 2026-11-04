
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
				
			}
		},
		error : function() {
			jAlert("Something went wrong, Please try after some time","Error");
		}
	});

}


function timeTableConfiguration()
{
	initConductedTimeTable();
	initSuggestedTimeTable();
}

function initConductedTimeTable()
{
	$.ajax({
		url :'getStudentConductedTimeTable.json',
		dataType : 'json',
		async : false,
		success : function(jArray) {
			var size=jArray.length;
			//alert(size);
			var timetable='<tr><th colspan="4" style="text-align:center">Today Time Table</th></tr>'+
				'<tr><th>Time</th><th>Course</th><th>Class</th></tr>';
			for(var i=0; i<size; i++)
			{
				var sdt=new Date(jArray[i]["startTime"]);
				var edt=new Date(jArray[i]["endTime"]);
				timetable+='<tr><td>'+sdt.getHours()+':'+sdt.getMinutes()+' - '+edt.getHours()+':'+edt.getMinutes()+'</td>';
				if(jArray[i]["subjectwiseBatchObj"]!=undefined)
					timetable+='<td>'+jArray[i]["subjectwiseBatchObj"]["subjectObj"]["subjectName"].gemsDecode()+'</td>';
				else
					timetable+='<td>'+jArray[i]["recess"]+'</td>';
				
				if(jArray[i]["infrastructureDetailObj"]!=undefined)
					timetable+='<td>'+jArray[i]["infrastructureDetailObj"]["name"]+'</td></tr>';
				else
					timetable+='<td>-</td></tr>';
			}
			$('#tblConductedTimeTable').html(timetable);
		},
		error : function() {
			jAlert("Something went wrong, Please try after some time","Error");
		}
	});
}

function initSuggestedTimeTable()
{
	$.ajax({
		url :'getStudentSuggestedTimeTable.json',
		dataType : 'json',
		async : false,
		success : function(jArray) {
			var size=jArray.length;
			//alert(size);
			
			for(var i=0; i<jArray[0].length; i++)
			{
				var table='<tr><td><label>'+jArray[0][i]["subjectName"].gemsDecode()+'</label><br /><label>'+
					jArray[0][i]["starttime"]+' - '+jArray[0][i]["endtime"]+'</label><br /><label>'+
						jArray[0][i]["class"]+'</label></td></tr>';
				$('#tblmon').append(table);
			}
			for(var i=0; i<jArray[1].length; i++)
			{
				var table='<tr><td><label>'+jArray[1][i]["subjectName"].gemsDecode()+'</label><br /><label>'+
				jArray[1][i]["starttime"]+' - '+jArray[1][i]["endtime"]+'</label><br /><label>'+
						jArray[1][i]["class"]+'</label></td></tr>';
				$('#tbltue').append(table);
			}
			for(var i=0; i<jArray[2].length; i++)
			{
				var table='<tr><td><label>'+jArray[2][i]["subjectName"].gemsDecode()+'<label><br /><label>'+
				jArray[2][i]["starttime"]+' - '+jArray[2][i]["endtime"]+'</label><br /><label>'+
						jArray[2][i]["class"]+'</label></td></tr>';
				$('#tblwed').append(table);
			}
			for(var i=0; i<jArray[3].length; i++)
			{
				var table='<tr><td><label>'+jArray[3][i]["subjectName"].gemsDecode()+'</label><br /><label>'+
					jArray[3][i]["starttime"]+' - '+jArray[3][i]["endtime"]+'</label><br /><label>'+
						jArray[3][i]["class"]+'</label></td></tr>';
				$('#tblthu').append(table);
			}
			for(var i=0; i<jArray[4].length; i++)
			{
				var table='<tr><td><label>'+jArray[4][i]["subjectName"].gemsDecode()+'</label><br /><label>'+
						jArray[4][i]["starttime"]+' - '+jArray[4][i]["endtime"]+'</label><br /><label>'+
						jArray[4][i]["class"]+'</label></td></tr>';
				$('#tblfri').append(table);
			}
			for(var i=0; i<jArray[5].length; i++)
			{
				var table='<tr><td><label>'+jArray[5][i]["subjectName"].gemsDecode()+'</label><br /><label>'+
				jArray[5][i]["starttime"]+' - '+jArray[5][i]["endtime"]+'</label><br /><label>'+
						jArray[5][i]["class"]+'</label></td></tr>';
				$('#tblsat').append(table);
			}
			for(var i=0; i<jArray[6].length; i++)
			{
				var table='<tr><td><label>'+jArray[6][i]["subjectName"].gemsDecode()+'</label><br /><label>'+
				jArray[6][i]["starttime"]+' - '+jArray[6][i]["endtime"]+'</label><br /><label>'+
						jArray[6][i]["class"]+'</label></td></tr>';
				$('#tblsun').append(table);
			}
		},
		error : function() {
			jAlert("Something went wrong, Please try after some time","Error");
		}
	});
}