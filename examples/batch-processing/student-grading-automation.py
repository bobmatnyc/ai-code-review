#!/usr/bin/env python3
"""
Student Grading Automation with AI Detection

This script automates the grading process for programming assignments with integrated
AI detection capabilities. It processes multiple student submissions, runs AI detection
analysis, and generates comprehensive grading reports.

Features:
- Batch processing of student submissions
- AI detection with configurable thresholds
- Automated grade calculation
- Academic integrity checking
- Detailed reporting and analytics
- Canvas/LMS integration support
"""

import argparse
import json
import logging
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import csv


@dataclass
class StudentSubmission:
    """Represents a student submission for evaluation."""
    student_id: str
    student_name: str
    submission_path: str
    submission_time: Optional[datetime] = None
    late_submission: bool = False


@dataclass
class AIDetectionResult:
    """AI detection analysis results."""
    is_ai_generated: bool
    confidence_score: float
    risk_level: str
    patterns_detected: int
    high_confidence_patterns: int
    analysis_time: int
    warnings: List[str]


@dataclass
class GradingResult:
    """Complete grading result for a student."""
    student_id: str
    student_name: str
    ai_detection: Optional[AIDetectionResult]
    overall_score: float
    grade_letter: str
    criteria_scores: Dict[str, float]
    feedback: str
    requires_manual_review: bool
    academic_integrity_flag: bool


class StudentGradingPipeline:
    """Main pipeline for automated student grading with AI detection."""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.setup_logging()
        
        # Results storage
        self.submissions: List[StudentSubmission] = []
        self.results: List[GradingResult] = []
        
    def _load_config(self, config_path: Optional[str]) -> Dict:
        """Load configuration from file or use defaults."""
        default_config = {
            "ai_detection": {
                "enabled": True,
                "threshold": 0.75,
                "analyzers": "git,documentation",
                "fail_on_detection": False,
                "include_in_report": True
            },
            "grading": {
                "system": "letter",  # letter, numeric, pass_fail
                "max_score": 100,
                "passing_threshold": 70,
                "criteria": {
                    "correctness": 40,
                    "code_quality": 25,
                    "documentation": 15,
                    "testing": 10,
                    "creativity": 10
                }
            },
            "assignment": {
                "title": "Programming Assignment",
                "difficulty": "mid",
                "type": "take-home",
                "late_penalty": 10  # percentage per day
            },
            "processing": {
                "parallel_workers": 4,
                "timeout_seconds": 300
            },
            "output": {
                "results_dir": "./grading-results",
                "reports_dir": "./grading-reports",
                "individual_feedback": True,
                "summary_report": True,
                "csv_export": True
            }
        }
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    user_config = json.load(f)
                # Merge user config with defaults
                self._deep_merge(default_config, user_config)
                logging.info(f"Loaded configuration from {config_path}")
            except Exception as e:
                logging.warning(f"Failed to load config from {config_path}: {e}")
                logging.info("Using default configuration")
        
        return default_config
    
    def _deep_merge(self, base_dict: Dict, update_dict: Dict) -> None:
        """Deep merge two dictionaries."""
        for key, value in update_dict.items():
            if key in base_dict and isinstance(base_dict[key], dict) and isinstance(value, dict):
                self._deep_merge(base_dict[key], value)
            else:
                base_dict[key] = value
    
    def setup_logging(self) -> None:
        """Configure logging for the pipeline."""
        log_level = logging.INFO
        if os.getenv('DEBUG', '').lower() == 'true':
            log_level = logging.DEBUG
            
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(
                    os.path.join(self.config['output']['results_dir'], 'grading.log')
                )
            ]
        )
    
    def discover_submissions(self, submissions_dir: str) -> List[StudentSubmission]:
        """Discover student submissions in the specified directory."""
        logging.info(f"Discovering submissions in {submissions_dir}")
        
        submissions = []
        submissions_path = Path(submissions_dir)
        
        if not submissions_path.exists():
            raise FileNotFoundError(f"Submissions directory not found: {submissions_dir}")
        
        # Look for student directories
        for student_dir in submissions_path.iterdir():
            if not student_dir.is_dir():
                continue
                
            # Extract student info from directory name
            # Expected format: studentid_lastname_firstname or similar
            student_id = student_dir.name
            student_name = self._extract_student_name(student_dir.name)
            
            # Check if directory contains code files
            if self._has_code_files(student_dir):
                submission = StudentSubmission(
                    student_id=student_id,
                    student_name=student_name,
                    submission_path=str(student_dir),
                    submission_time=self._get_submission_time(student_dir)
                )
                
                # Check for late submission
                submission.late_submission = self._is_late_submission(submission.submission_time)
                
                submissions.append(submission)
                logging.debug(f"Found submission: {student_id}")
            else:
                logging.warning(f"No code files found in {student_dir}")
        
        logging.info(f"Discovered {len(submissions)} valid submissions")
        return submissions
    
    def _extract_student_name(self, dir_name: str) -> str:
        """Extract student name from directory name."""
        # Handle common formats: studentid_lastname_firstname, lastname_firstname, etc.
        parts = dir_name.replace('_', ' ').replace('-', ' ').split()
        if len(parts) >= 2:
            return ' '.join(parts[1:])  # Skip first part (likely student ID)
        return dir_name
    
    def _has_code_files(self, directory: Path) -> bool:
        """Check if directory contains code files."""
        code_extensions = {'.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rb', '.php', '.cs'}
        
        for file_path in directory.rglob('*'):
            if file_path.suffix.lower() in code_extensions:
                return True
        return False
    
    def _get_submission_time(self, directory: Path) -> Optional[datetime]:
        """Get submission timestamp from directory or files."""
        try:
            # Use directory modification time as approximation
            stat = directory.stat()
            return datetime.fromtimestamp(stat.st_mtime)
        except Exception:
            return None
    
    def _is_late_submission(self, submission_time: Optional[datetime]) -> bool:
        """Check if submission was late (placeholder implementation)."""
        # In real implementation, compare with assignment due date
        return False
    
    def run_ai_detection(self, submission: StudentSubmission) -> Optional[AIDetectionResult]:
        """Run AI detection analysis on a student submission."""
        if not self.config['ai_detection']['enabled']:
            return None
            
        logging.info(f"Running AI detection for {submission.student_id}")
        
        try:
            # Build AI code review command
            cmd = [
                'ai-code-review',
                submission.submission_path,
                '--type', 'coding-test',
                '--enable-ai-detection',
                '--ai-detection-threshold', str(self.config['ai_detection']['threshold']),
                '--ai-detection-analyzers', self.config['ai_detection']['analyzers'],
                '--ai-detection-include-in-report',
                '--format', 'json',
                '--output', f"/tmp/ai-detection-{submission.student_id}.json"
            ]
            
            # Run the command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.config['processing']['timeout_seconds']
            )
            
            # Parse results
            output_file = f"/tmp/ai-detection-{submission.student_id}.json"
            if os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    data = json.load(f)
                
                ai_data = data.get('metadata', {}).get('aiDetection', {})
                
                # Determine risk level
                confidence = ai_data.get('confidenceScore', 0)
                if confidence >= 0.9:
                    risk_level = "CRITICAL"
                elif confidence >= 0.8:
                    risk_level = "HIGH"
                elif confidence >= 0.6:
                    risk_level = "MEDIUM"
                else:
                    risk_level = "LOW"
                
                return AIDetectionResult(
                    is_ai_generated=ai_data.get('isAIGenerated', False),
                    confidence_score=confidence,
                    risk_level=risk_level,
                    patterns_detected=ai_data.get('patternsDetected', 0),
                    high_confidence_patterns=ai_data.get('highConfidencePatterns', 0),
                    analysis_time=ai_data.get('analysisTime', 0),
                    warnings=[]
                )
                
        except subprocess.TimeoutExpired:
            logging.error(f"AI detection timeout for {submission.student_id}")
        except Exception as e:
            logging.error(f"AI detection failed for {submission.student_id}: {e}")
        
        return None
    
    def calculate_grade(self, submission: StudentSubmission, 
                       ai_result: Optional[AIDetectionResult]) -> GradingResult:
        """Calculate grade for a student submission."""
        logging.info(f"Calculating grade for {submission.student_id}")
        
        # This is a simplified grading logic - in practice, you'd integrate with
        # actual code analysis, test results, etc.
        
        # Base scores (would come from actual code analysis)
        base_scores = {
            "correctness": 85,
            "code_quality": 78,
            "documentation": 90,
            "testing": 75,
            "creativity": 80
        }
        
        # Apply AI detection penalties if needed
        academic_integrity_flag = False
        requires_manual_review = False
        
        if ai_result and ai_result.is_ai_generated:
            academic_integrity_flag = True
            requires_manual_review = True
            
            # Apply penalty based on confidence and config
            if self.config['ai_detection']['fail_on_detection']:
                # Automatic failure
                base_scores = {key: 0 for key in base_scores}
            else:
                # Penalty based on confidence
                penalty_factor = min(0.5, ai_result.confidence_score)
                for key in base_scores:
                    base_scores[key] *= (1 - penalty_factor)
        
        # Apply late penalty
        if submission.late_submission:
            penalty = self.config['assignment']['late_penalty'] / 100
            for key in base_scores:
                base_scores[key] *= (1 - penalty)
        
        # Calculate weighted overall score
        criteria_weights = self.config['grading']['criteria']
        total_weight = sum(criteria_weights.values())
        
        overall_score = 0
        for criterion, score in base_scores.items():
            weight = criteria_weights.get(criterion, 0) / total_weight
            overall_score += score * weight
        
        # Convert to letter grade
        grade_letter = self._score_to_letter_grade(overall_score)
        
        # Generate feedback
        feedback = self._generate_feedback(submission, ai_result, base_scores, overall_score)
        
        return GradingResult(
            student_id=submission.student_id,
            student_name=submission.student_name,
            ai_detection=ai_result,
            overall_score=overall_score,
            grade_letter=grade_letter,
            criteria_scores=base_scores,
            feedback=feedback,
            requires_manual_review=requires_manual_review,
            academic_integrity_flag=academic_integrity_flag
        )
    
    def _score_to_letter_grade(self, score: float) -> str:
        """Convert numeric score to letter grade."""
        if score >= 97: return "A+"
        elif score >= 93: return "A"
        elif score >= 90: return "A-"
        elif score >= 87: return "B+"
        elif score >= 83: return "B"
        elif score >= 80: return "B-"
        elif score >= 77: return "C+"
        elif score >= 73: return "C"
        elif score >= 70: return "C-"
        elif score >= 67: return "D+"
        elif score >= 63: return "D"
        elif score >= 60: return "D-"
        else: return "F"
    
    def _generate_feedback(self, submission: StudentSubmission, 
                          ai_result: Optional[AIDetectionResult],
                          scores: Dict[str, float], overall_score: float) -> str:
        """Generate personalized feedback for student."""
        feedback_parts = []
        
        # Overall performance
        feedback_parts.append(f"Overall Score: {overall_score:.1f}/100")
        feedback_parts.append("")
        
        # Detailed scores
        feedback_parts.append("Detailed Breakdown:")
        for criterion, score in scores.items():
            feedback_parts.append(f"- {criterion.title()}: {score:.1f}/100")
        feedback_parts.append("")
        
        # AI detection results
        if ai_result:
            if ai_result.is_ai_generated:
                feedback_parts.append("⚠️ ACADEMIC INTEGRITY ALERT:")
                feedback_parts.append(f"AI-generated content detected (confidence: {ai_result.confidence_score:.3f})")
                feedback_parts.append(f"Risk level: {ai_result.risk_level}")
                feedback_parts.append("This submission requires manual review and discussion.")
                feedback_parts.append("")
            else:
                feedback_parts.append("✅ Academic integrity check passed")
                feedback_parts.append("")
        
        # Late submission penalty
        if submission.late_submission:
            penalty = self.config['assignment']['late_penalty']
            feedback_parts.append(f"⏰ Late submission penalty applied: -{penalty}%")
            feedback_parts.append("")
        
        # Recommendations
        feedback_parts.append("Recommendations:")
        if overall_score >= 90:
            feedback_parts.append("- Excellent work! Continue practicing these skills.")
        elif overall_score >= 80:
            feedback_parts.append("- Good work! Focus on code quality and documentation.")
        elif overall_score >= 70:
            feedback_parts.append("- Passing grade. Review feedback and improve weak areas.")
        else:
            feedback_parts.append("- Below passing. Please review course materials and seek help.")
        
        if ai_result and ai_result.is_ai_generated:
            feedback_parts.append("- Schedule meeting to discuss academic integrity policies.")
            feedback_parts.append("- Complete assignment independently for full credit.")
        
        return "\n".join(feedback_parts)
    
    def process_submission(self, submission: StudentSubmission) -> GradingResult:
        """Process a single student submission."""
        try:
            # Run AI detection
            ai_result = self.run_ai_detection(submission)
            
            # Calculate grade
            grade_result = self.calculate_grade(submission, ai_result)
            
            logging.info(f"Processed {submission.student_id}: {grade_result.grade_letter} ({grade_result.overall_score:.1f})")
            
            return grade_result
            
        except Exception as e:
            logging.error(f"Failed to process {submission.student_id}: {e}")
            # Return default failing grade
            return GradingResult(
                student_id=submission.student_id,
                student_name=submission.student_name,
                ai_detection=None,
                overall_score=0,
                grade_letter="F",
                criteria_scores={},
                feedback=f"Processing failed: {str(e)}",
                requires_manual_review=True,
                academic_integrity_flag=False
            )
    
    def process_all_submissions(self, submissions: List[StudentSubmission]) -> List[GradingResult]:
        """Process all submissions in parallel."""
        logging.info(f"Processing {len(submissions)} submissions with {self.config['processing']['parallel_workers']} workers")
        
        results = []
        
        with ThreadPoolExecutor(max_workers=self.config['processing']['parallel_workers']) as executor:
            # Submit all tasks
            future_to_submission = {
                executor.submit(self.process_submission, submission): submission
                for submission in submissions
            }
            
            # Collect results
            for future in as_completed(future_to_submission):
                submission = future_to_submission[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    logging.error(f"Task failed for {submission.student_id}: {e}")
        
        return results
    
    def generate_reports(self, results: List[GradingResult]) -> None:
        """Generate comprehensive grading reports."""
        output_config = self.config['output']
        
        # Create output directories
        os.makedirs(output_config['results_dir'], exist_ok=True)
        os.makedirs(output_config['reports_dir'], exist_ok=True)
        
        # Individual feedback files
        if output_config['individual_feedback']:
            self._generate_individual_feedback(results)
        
        # Summary report
        if output_config['summary_report']:
            self._generate_summary_report(results)
        
        # CSV export
        if output_config['csv_export']:
            self._generate_csv_export(results)
        
        # Academic integrity report
        self._generate_integrity_report(results)
    
    def _generate_individual_feedback(self, results: List[GradingResult]) -> None:
        """Generate individual feedback files for each student."""
        logging.info("Generating individual feedback files")
        
        for result in results:
            filename = f"{result.student_id}_feedback.md"
            filepath = os.path.join(self.config['output']['reports_dir'], filename)
            
            with open(filepath, 'w') as f:
                f.write(f"# Feedback for {result.student_name} ({result.student_id})\n\n")
                f.write(f"**Grade:** {result.grade_letter} ({result.overall_score:.1f}/100)\n\n")
                
                if result.academic_integrity_flag:
                    f.write("## ⚠️ Academic Integrity Alert\n\n")
                    f.write("This submission has been flagged for potential AI assistance. ")
                    f.write("Please schedule a meeting to discuss this assignment.\n\n")
                
                f.write("## Detailed Feedback\n\n")
                f.write(result.feedback)
                f.write("\n\n---\n\n")
                f.write(f"*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n")
    
    def _generate_summary_report(self, results: List[GradingResult]) -> None:
        """Generate summary report for the entire class."""
        logging.info("Generating summary report")
        
        filepath = os.path.join(self.config['output']['reports_dir'], 'grading_summary.md')
        
        # Calculate statistics
        total_students = len(results)
        avg_score = sum(r.overall_score for r in results) / total_students if total_students > 0 else 0
        ai_flagged = len([r for r in results if r.academic_integrity_flag])
        manual_review_needed = len([r for r in results if r.requires_manual_review])
        
        grade_distribution = {}
        for result in results:
            grade_distribution[result.grade_letter] = grade_distribution.get(result.grade_letter, 0) + 1
        
        with open(filepath, 'w') as f:
            f.write("# Class Grading Summary\n\n")
            f.write(f"**Assignment:** {self.config['assignment']['title']}\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Total Students:** {total_students}\n\n")
            
            f.write("## Statistics\n\n")
            f.write(f"- **Average Score:** {avg_score:.1f}/100\n")
            f.write(f"- **AI Detection Alerts:** {ai_flagged}\n")
            f.write(f"- **Manual Review Needed:** {manual_review_needed}\n\n")
            
            f.write("## Grade Distribution\n\n")
            f.write("| Grade | Count | Percentage |\n")
            f.write("|-------|-------|------------|\n")
            for grade in ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"]:
                count = grade_distribution.get(grade, 0)
                percentage = (count / total_students * 100) if total_students > 0 else 0
                f.write(f"| {grade} | {count} | {percentage:.1f}% |\n")
            
            if ai_flagged > 0:
                f.write("\n## Academic Integrity Alerts\n\n")
                ai_flagged_students = [r for r in results if r.academic_integrity_flag]
                for result in ai_flagged_students:
                    ai_info = result.ai_detection
                    f.write(f"- **{result.student_name}** ({result.student_id}): ")
                    f.write(f"Confidence {ai_info.confidence_score:.3f}, Risk {ai_info.risk_level}\n")
    
    def _generate_csv_export(self, results: List[GradingResult]) -> None:
        """Generate CSV export for gradebook import."""
        logging.info("Generating CSV export")
        
        filepath = os.path.join(self.config['output']['results_dir'], 'grades.csv')
        
        with open(filepath, 'w', newline='') as csvfile:
            fieldnames = [
                'student_id', 'student_name', 'overall_score', 'grade_letter',
                'ai_detected', 'ai_confidence', 'ai_risk_level',
                'requires_manual_review', 'academic_integrity_flag'
            ]
            
            # Add criteria scores
            if results:
                criteria = list(results[0].criteria_scores.keys())
                fieldnames.extend(criteria)
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for result in results:
                row = {
                    'student_id': result.student_id,
                    'student_name': result.student_name,
                    'overall_score': result.overall_score,
                    'grade_letter': result.grade_letter,
                    'ai_detected': result.ai_detection.is_ai_generated if result.ai_detection else False,
                    'ai_confidence': result.ai_detection.confidence_score if result.ai_detection else 0,
                    'ai_risk_level': result.ai_detection.risk_level if result.ai_detection else 'N/A',
                    'requires_manual_review': result.requires_manual_review,
                    'academic_integrity_flag': result.academic_integrity_flag
                }
                
                # Add criteria scores
                row.update(result.criteria_scores)
                
                writer.writerow(row)
    
    def _generate_integrity_report(self, results: List[GradingResult]) -> None:
        """Generate detailed academic integrity report."""
        ai_flagged = [r for r in results if r.academic_integrity_flag]
        
        if not ai_flagged:
            return
            
        logging.info(f"Generating academic integrity report for {len(ai_flagged)} students")
        
        filepath = os.path.join(self.config['output']['reports_dir'], 'academic_integrity_report.md')
        
        with open(filepath, 'w') as f:
            f.write("# Academic Integrity Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Students Flagged:** {len(ai_flagged)}\n\n")
            
            f.write("## Summary\n\n")
            f.write("The following students have been flagged for potential AI assistance ")
            f.write("in their submissions. Each case requires manual review and discussion.\n\n")
            
            f.write("## Flagged Submissions\n\n")
            
            for result in ai_flagged:
                ai_info = result.ai_detection
                f.write(f"### {result.student_name} ({result.student_id})\n\n")
                f.write(f"- **Confidence Score:** {ai_info.confidence_score:.3f}\n")
                f.write(f"- **Risk Level:** {ai_info.risk_level}\n")
                f.write(f"- **Patterns Detected:** {ai_info.patterns_detected}\n")
                f.write(f"- **Grade Impact:** {result.overall_score:.1f}/100 ({result.grade_letter})\n")
                f.write(f"- **Action Required:** Manual review and student meeting\n\n")
    
    def run_pipeline(self, submissions_dir: str) -> None:
        """Run the complete grading pipeline."""
        logging.info("Starting student grading pipeline")
        
        try:
            # Discover submissions
            self.submissions = self.discover_submissions(submissions_dir)
            
            if not self.submissions:
                logging.error("No submissions found")
                return
            
            # Process all submissions
            self.results = self.process_all_submissions(self.submissions)
            
            # Generate reports
            self.generate_reports(self.results)
            
            # Print summary
            total = len(self.results)
            ai_flagged = len([r for r in self.results if r.academic_integrity_flag])
            avg_score = sum(r.overall_score for r in self.results) / total if total > 0 else 0
            
            logging.info("Pipeline completed successfully!")
            logging.info(f"Processed {total} submissions")
            logging.info(f"Average score: {avg_score:.1f}")
            logging.info(f"AI integrity alerts: {ai_flagged}")
            
        except Exception as e:
            logging.error(f"Pipeline failed: {e}")
            raise


def main():
    """Main entry point for the grading pipeline."""
    parser = argparse.ArgumentParser(description="Student Grading Automation with AI Detection")
    parser.add_argument("submissions_dir", help="Directory containing student submissions")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    args = parser.parse_args()
    
    # Set debug mode
    if args.debug:
        os.environ['DEBUG'] = 'true'
    
    # Run pipeline
    pipeline = StudentGradingPipeline(args.config)
    pipeline.run_pipeline(args.submissions_dir)


if __name__ == "__main__":
    main()