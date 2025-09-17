
'use server';

import type { AttendanceRecord, EnrichedAttendanceRecord } from '@/app/(dashboard)/hr/attendance/page';

/**
* Takes a raw attendance record and enriches it with calculated status and overtime.
*/
export async function enrichAttendanceRecord(record: AttendanceRecord, settings: any): Promise<EnrichedAttendanceRecord> {
    const enrichedRecord: EnrichedAttendanceRecord = { ...record, raw_overtime_hours: 0, payable_overtime_hours: 0 };
    
    if (!settings || !settings.standard_work_hours || !settings.overtime_rules) {
        console.error("Attendance settings are missing or incomplete.");
        return { ...record, status: record.status || 'Absent', raw_overtime_hours: 0, payable_overtime_hours: 0 };
    }
    
    const recordDate = new Date(record.date.replace(/-/g, '/'));
    recordDate.setHours(0, 0, 0, 0); 
    const dayOfWeek = recordDate.getDay();

    const isWeeklyHoliday = (settings.weekly_holidays || []).includes(dayOfWeek);
    const isPublicHoliday = (settings.holidays || []).some((h: {date: string}) => new Date(h.date.replace(/-/g, '/')).getTime() === recordDate.getTime());
    const isHoliday = isWeeklyHoliday || isPublicHoliday;
    
    const hasWorked = record.status !== 'Absent' && record.status !== 'Leave' && record.in_time && record.out_time;

    if (hasWorked) {
        const inDateTime = new Date(`${record.date}T${record.in_time}`);
        const outDateTime = new Date(`${record.date}T${record.out_time}`);
        
        // Ensure out time is after in time
        if (outDateTime <= inDateTime) {
            return { ...enrichedRecord, status: record.status || 'Present' };
        }

        const workDurationMs = outDateTime.getTime() - inDateTime.getTime();
        const workDurationHours = parseFloat((workDurationMs / (1000 * 60 * 60)).toFixed(2));
        
        if (isHoliday) {
            enrichedRecord.status = 'Present'; // Working on a holiday is still 'Present'
            enrichedRecord.raw_overtime_hours = workDurationHours;
            
            const standardWorkDurationHours = 9;
            const holidayRate = 2;
            const holidayAfterHoursRate = 3;
            
            if (workDurationHours > standardWorkDurationHours) {
                const regularHolidayHours = standardWorkDurationHours;
                const afterHoursHoliday = workDurationHours - standardWorkDurationHours;
                enrichedRecord.payable_overtime_hours = (regularHolidayHours * holidayRate) + (afterHoursHoliday * holidayAfterHoursRate);
            } else {
                enrichedRecord.payable_overtime_hours = workDurationHours * holidayRate;
            }

        } else { // It's a normal workday.
            const standardInDateTime = new Date(`${record.date}T${settings.standard_work_hours.in_time}`);
            const standardOutDateTime = new Date(`${record.date}T${settings.standard_work_hours.out_time}`);
            
            enrichedRecord.status = inDateTime > standardInDateTime ? 'Late' : 'Present';
            
            // OT is only for time worked AFTER standard out-time
            if (outDateTime > standardOutDateTime) {
                const diffMs = outDateTime.getTime() - standardOutDateTime.getTime();
                const diffMins = diffMs / (1000 * 60);
                const minOTMins = settings.overtime_rules.minimum_minutes_after_out_time || 0;

                // Check if they meet the minimum threshold for OT
                if (diffMins >= minOTMins) {
                    const rawOT = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
                    const normalRate = 1.5;
                    enrichedRecord.raw_overtime_hours = rawOT;
                    enrichedRecord.payable_overtime_hours = rawOT * normalRate;
                }
            }
        }
    } else {
        // Handle non-working statuses
        if (isHoliday && record.status !== 'Leave' && record.status !== 'Absent') {
            enrichedRecord.status = 'Holiday';
        }
    }
    
    return enrichedRecord;
}


/**
 * Takes an array of pre-enriched attendance records for a single employee and calculates summary stats.
 */
export async function calculateAttendanceLogic(employeeRecords: EnrichedAttendanceRecord[]) {
    
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;
    let rawTotalOT = 0;
    let payableOTHours = 0;

    employeeRecords.forEach(rec => {
        switch (rec.status) {
            case 'Present':
                presentDays++;
                break;
            case 'Late':
                lateDays++;
                break;
            case 'Absent':
                absentDays++;
                break;
            case 'Leave':
                leaveDays++;
                break;
            case 'Holiday':
                holidayDays++;
                break;
        }
        rawTotalOT += rec.raw_overtime_hours || 0;
        payableOTHours += rec.payable_overtime_hours || 0;
    });

    // For payroll purposes, "late" days are also "present" days.
    const totalPresentDays = presentDays + lateDays;

    return {
        presentDays: totalPresentDays,
        lateDays,
        absentDays,
        leaveDays,
        holidayDays,
        rawTotalOT,
        payableOTHours
    };
}
